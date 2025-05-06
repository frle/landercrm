import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertLandingPageSchema, insertCategorySchema, insertDomainChangeSchema, insertActivityLogSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper to ensure a directory exists
const ensureDirectoryExists = (directory: string) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Set up file storage directories
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const SCREENSHOTS_DIR = path.join(UPLOAD_DIR, "screenshots");
const ZIP_FILES_DIR = path.join(UPLOAD_DIR, "zip-files");

ensureDirectoryExists(SCREENSHOTS_DIR);
ensureDirectoryExists(ZIP_FILES_DIR);

// Set up multer storage
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "screenshot") {
      cb(null, SCREENSHOTS_DIR);
    } else if (file.fieldname === "zipFile") {
      cb(null, ZIP_FILES_DIR);
    } else {
      cb(new Error("Invalid fieldname"), "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = nanoid();
    const extname = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueId}${extname}`);
  }
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "screenshot") {
      // Allow only image files for screenshots
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed for screenshots"));
      }
    } else if (file.fieldname === "zipFile") {
      // Allow only zip files
      if (file.mimetype !== "application/zip" && file.mimetype !== "application/x-zip-compressed") {
        return cb(new Error("Only ZIP files are allowed"));
      }
    }
    cb(null, true);
  }
});

// Role-based access control middleware
const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    
    if (req.user.role !== role && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Error handling middleware
  const handleError = (err: any, res: Response) => {
    console.error("API Error:", err);
    
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ 
        message: "Validation error", 
        errors: validationError.details 
      });
    }
    
    if (err.status || err.statusCode) {
      return res.status(err.status || err.statusCode).json({ message: err.message });
    }
    
    return res.status(500).json({ message: "Internal server error" });
  };

  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      
      // Count landing pages for each category
      const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
        const { landingPages } = await storage.getAllLandingPages({ 
          categoryId: category.id
        });
        return {
          ...category,
          pageCount: landingPages.length
        };
      }));
      
      res.json(categoriesWithCounts);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/categories", requireRole("admin"), async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: "create",
        entityType: "category",
        entityId: category.id,
        details: `Created category: ${category.name}`
      });
      
      res.status(201).json(category);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Landing pages API
  app.get("/api/landing-pages", async (req, res) => {
    try {
      const { category, search, date, page, limit, sortBy, sortOrder } = req.query;
      
      const result = await storage.getAllLandingPages({
        categoryId: category ? Number(category) : undefined,
        searchTerm: search as string,
        dateFilter: date as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/landing-pages/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const landingPage = await storage.getLandingPageWithCategory(id);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      res.json(landingPage);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/landing-pages", requireRole("admin"), upload.fields([
    { name: "screenshot", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};
      
      const screenshotFile = files?.screenshot?.[0];

      console.log("Request body:", req.body);
      
      // Parse and validate the request body
      const landingPageData = insertLandingPageSchema.parse({
        ...req.body,
        categoryId: req.body.categoryId ? Number(req.body.categoryId) : null,
        createdBy: req.user!.id,
        screenshotUrl: screenshotFile ? `/uploads/screenshots/${screenshotFile.filename}` : null,
        zipFileUrl: req.body.zipFileUrl || null
      });
      
      const landingPage = await storage.createLandingPage(landingPageData);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: "create",
        entityType: "landingPage",
        entityId: landingPage.id,
        details: `Created landing page: ${landingPage.name}`
      });
      
      res.status(201).json(landingPage);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/landing-pages/:id", requireRole("admin"), upload.fields([
    { name: "screenshot", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};
      
      const existingLandingPage = await storage.getLandingPage(id);
      if (!existingLandingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      const screenshotFile = files.screenshot?.[0];
      
      const updateData: any = {
        ...req.body,
        categoryId: req.body.categoryId ? Number(req.body.categoryId) : null
      };
      
      if (screenshotFile) {
        updateData.screenshotUrl = `/uploads/screenshots/${screenshotFile.filename}`;
      }
      
      // If zipFileUrl is provided in the form, use it directly
      if (req.body.zipFileUrl) {
        updateData.zipFileUrl = req.body.zipFileUrl;
      }
      
      const updatedLandingPage = await storage.updateLandingPage(id, updateData);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: "update",
        entityType: "landingPage",
        entityId: id,
        details: `Updated landing page: ${updatedLandingPage!.name}`
      });
      
      res.json(updatedLandingPage);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/landing-pages/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      const landingPage = await storage.getLandingPage(id);
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      const success = await storage.deleteLandingPage(id);
      
      if (success) {
        // Log activity
        await storage.logActivity({
          userId: req.user!.id,
          action: "delete",
          entityType: "landingPage",
          entityId: id,
          details: `Deleted landing page: ${landingPage.name}`
        });
        
        // Delete associated screenshot file if it's local
        if (landingPage.screenshotUrl && landingPage.screenshotUrl.startsWith('/uploads/')) {
          const screenshotPath = path.join(process.cwd(), landingPage.screenshotUrl);
          if (fs.existsSync(screenshotPath)) {
            fs.unlinkSync(screenshotPath);
          }
        }
        
        // We don't need to delete ZIP files since they're now external URLs
        
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete landing page" });
      }
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/landing-pages/:id/download", async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      const landingPage = await storage.getLandingPage(id);
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      
      if (!landingPage.zipFileUrl) {
        return res.status(404).json({ message: "No ZIP file available for this landing page" });
      }
      
      // Increment download count
      await storage.incrementDownloadCount(id);
      
      // Log activity if user is authenticated
      if (req.isAuthenticated()) {
        await storage.logActivity({
          userId: req.user!.id,
          action: "download",
          entityType: "landingPage",
          entityId: id,
          details: `Downloaded landing page: ${landingPage.name}`
        });
      }
      
      res.json({ success: true, zipFileUrl: landingPage.zipFileUrl });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Dashboard API
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/dashboard/recent-activity", async (req, res) => {
    try {
      const activities = await storage.getRecentActivity();
      res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/dashboard/category-breakdown", async (req, res) => {
    try {
      const breakdown = await storage.getCategoryBreakdown();
      res.json(breakdown);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/dashboard/recent-landing-pages", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 3;
      const recentPages = await storage.getRecentLandingPages(limit);
      res.json(recentPages);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Domain management API
  app.post("/api/domains/replace", requireRole("admin"), async (req, res) => {
    try {
      const { oldDomain, newDomain, previewMode } = req.body;
      
      if (!oldDomain || !newDomain) {
        return res.status(400).json({ message: "Old domain and new domain are required" });
      }
      
      const result = await storage.performDomainReplace(
        oldDomain,
        newDomain,
        req.user!.id,
        previewMode === true
      );
      
      // Log activity if not in preview mode
      if (!previewMode && result.recordsAffected > 0) {
        await storage.logActivity({
          userId: req.user!.id,
          action: "domain-replace",
          entityType: "domain",
          details: `Replaced domain '${oldDomain}' with '${newDomain}', affecting ${result.recordsAffected} records`
        });
      }
      
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/domains/history", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const domainChanges = await storage.getRecentDomainChanges(limit);
      res.json(domainChanges);
    } catch (err) {
      handleError(err, res);
    }
  });

  // User management API (admin only)
  app.get("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Don't return password hashes
      const sanitizedUsers = users.map(user => {
        const { password, ...userData } = user;
        return userData;
      });
      
      res.json(sanitizedUsers);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // Ensure we're not updating password through this endpoint
      const { password, ...updateData } = req.body;
      
      const updatedUser = await storage.updateUser(id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: "update",
        entityType: "user",
        entityId: id,
        details: `Updated user: ${updatedUser.username}`
      });
      
      // Don't return password hash
      const { password: _, ...userData } = updatedUser;
      
      res.json(userData);
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.delete("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // Don't allow deleting the admin user
      if (id === 1) {
        return res.status(403).json({ message: "Cannot delete admin user" });
      }
      
      // Don't allow deleting yourself
      if (id === req.user!.id) {
        return res.status(403).json({ message: "Cannot delete your own account" });
      }
      
      // Get user before deletion for logging
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const success = await storage.deleteUser(id);
      
      if (success) {
        // Log user deletion
        await storage.logActivity({
          userId: req.user!.id,
          action: "delete",
          entityType: "user",
          entityId: id,
          details: `Deleted user: ${user.username}`
        });
        
        res.status(204).end();
      } else {
        res.status(500).json({ message: "Failed to delete user" });
      }
    } catch (err) {
      handleError(err, res);
    }
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    // Check if user is authenticated for accessing files
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    next();
  }, express.static(UPLOAD_DIR));

  return httpServer;
}
