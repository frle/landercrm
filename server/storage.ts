import { users, User, InsertUser, categories, Category, InsertCategory, landingPages, LandingPage, InsertLandingPage, domainChanges, DomainChange, InsertDomainChange, activityLogs, ActivityLog, InsertActivityLog } from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, asc, sql, or, isNotNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Category methods
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  getAllCategories(): Promise<Category[]>;
  
  // Landing page methods
  getLandingPage(id: number): Promise<LandingPage | undefined>;
  getLandingPageWithCategory(id: number): Promise<any>;
  createLandingPage(landingPage: InsertLandingPage): Promise<LandingPage>;
  updateLandingPage(id: number, data: Partial<LandingPage>): Promise<LandingPage | undefined>;
  deleteLandingPage(id: number): Promise<boolean>;
  getAllLandingPages(options?: { 
    categoryId?: number; 
    searchTerm?: string; 
    dateFilter?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ landingPages: LandingPage[], total: number }>;
  getRecentLandingPages(limit?: number): Promise<LandingPage[]>;
  incrementDownloadCount(id: number): Promise<boolean>;
  
  // Domain change methods
  createDomainChange(domainChange: InsertDomainChange): Promise<DomainChange>;
  getRecentDomainChanges(limit?: number): Promise<DomainChange[]>;
  performDomainReplace(oldDomain: string, newDomain: string, userId: number, previewMode?: boolean): 
    Promise<{ recordsAffected: number, affectedPages: LandingPage[] }>;
  
  // Activity log methods
  logActivity(activityLog: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivity(limit?: number): Promise<any[]>;
  
  // Stats methods
  getDashboardStats(): Promise<{
    totalLandingPages: number;
    totalDownloads: number;
    categoriesCount: number;
    activeUsers: number;
  }>;
  
  getCategoryBreakdown(): Promise<{ categoryName: string; percentage: number }[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Create session store
    this.sessionStore = new PostgresSessionStore({ 
      conObject: { 
        connectionString: process.env.DATABASE_URL 
      }, 
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Don't allow deleting the admin user (id 1)
    if (id === 1) {
      return false;
    }
    
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return result.length > 0;
  }

  // Category methods
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  // Landing page methods
  async getLandingPage(id: number): Promise<LandingPage | undefined> {
    const [landingPage] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    return landingPage || undefined;
  }

  async getLandingPageWithCategory(id: number): Promise<any> {
    const result = await db.query.landingPages.findFirst({
      where: eq(landingPages.id, id),
      with: {
        category: true,
        creator: true
      }
    });
    return result;
  }

  async createLandingPage(landingPage: InsertLandingPage): Promise<LandingPage> {
    const [newLandingPage] = await db
      .insert(landingPages)
      .values({
        ...landingPage,
        updatedAt: new Date()
      })
      .returning();
    return newLandingPage;
  }

  async updateLandingPage(id: number, data: Partial<LandingPage>): Promise<LandingPage | undefined> {
    const [updatedLandingPage] = await db
      .update(landingPages)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(landingPages.id, id))
      .returning();
    return updatedLandingPage || undefined;
  }

  async deleteLandingPage(id: number): Promise<boolean> {
    const result = await db
      .delete(landingPages)
      .where(eq(landingPages.id, id))
      .returning({ id: landingPages.id });
    return result.length > 0;
  }

  async getAllLandingPages(options: { 
    categoryId?: number; 
    searchTerm?: string; 
    dateFilter?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ landingPages: LandingPage[], total: number }> {
    const { 
      categoryId, 
      searchTerm, 
      dateFilter,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    let query = db.select().from(landingPages);
    let countQuery = db.select({ count: sql`count(*)` }).from(landingPages);
    
    // Apply filters
    const filters = [];
    
    if (categoryId) {
      filters.push(eq(landingPages.categoryId, categoryId));
    }
    
    if (searchTerm) {
      filters.push(or(
        like(landingPages.name, `%${searchTerm}%`),
        like(landingPages.description || '', `%${searchTerm}%`),
        like(landingPages.mainHeadline || '', `%${searchTerm}%`)
      ));
    }
    
    if (dateFilter) {
      const now = new Date();
      let dateCondition;
      
      switch (dateFilter) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateCondition = sql`${landingPages.createdAt} >= ${today.toISOString()}`;
          break;
        case 'week':
          const lastWeek = new Date(now);
          lastWeek.setDate(now.getDate() - 7);
          dateCondition = sql`${landingPages.createdAt} >= ${lastWeek.toISOString()}`;
          break;
        case 'month':
          const lastMonth = new Date(now);
          lastMonth.setMonth(now.getMonth() - 1);
          dateCondition = sql`${landingPages.createdAt} >= ${lastMonth.toISOString()}`;
          break;
        case 'year':
          const lastYear = new Date(now);
          lastYear.setFullYear(now.getFullYear() - 1);
          dateCondition = sql`${landingPages.createdAt} >= ${lastYear.toISOString()}`;
          break;
      }
      
      if (dateCondition) {
        filters.push(dateCondition);
      }
    }
    
    if (filters.length > 0) {
      const whereCondition = filters.reduce((acc, condition) => and(acc, condition));
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }
    
    // Apply sorting
    const sortColumn = landingPages[sortBy as keyof typeof landingPages] || landingPages.createdAt;
    query = sortOrder === 'asc' 
      ? query.orderBy(asc(sortColumn)) 
      : query.orderBy(desc(sortColumn));
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    // Execute queries
    const results = await query;
    const [{ count }] = await countQuery;
    
    return {
      landingPages: results,
      total: Number(count)
    };
  }

  async getRecentLandingPages(limit = 3): Promise<LandingPage[]> {
    return db.select()
      .from(landingPages)
      .orderBy(desc(landingPages.createdAt))
      .limit(limit);
  }

  async incrementDownloadCount(id: number): Promise<boolean> {
    const [updatedLandingPage] = await db
      .update(landingPages)
      .set({
        downloadCount: sql`${landingPages.downloadCount} + 1`
      })
      .where(eq(landingPages.id, id))
      .returning({ id: landingPages.id });
    
    return !!updatedLandingPage;
  }

  // Domain change methods
  async createDomainChange(domainChange: InsertDomainChange): Promise<DomainChange> {
    const [newDomainChange] = await db
      .insert(domainChanges)
      .values(domainChange)
      .returning();
    return newDomainChange;
  }

  async getRecentDomainChanges(limit = 10): Promise<DomainChange[]> {
    return db.select()
      .from(domainChanges)
      .orderBy(desc(domainChanges.changedAt))
      .limit(limit);
  }

  async performDomainReplace(oldDomain: string, newDomain: string, userId: number, previewMode = false): 
    Promise<{ recordsAffected: number, affectedPages: LandingPage[] }> {
    // Find all affected landing pages
    const affectedPages = await db.select()
      .from(landingPages)
      .where(or(
        like(landingPages.liveUrl || '', `%${oldDomain}%`),
        like(landingPages.zipFileUrl || '', `%${oldDomain}%`)
      ));
    
    if (previewMode || affectedPages.length === 0) {
      return { recordsAffected: affectedPages.length, affectedPages };
    }
    
    // Replace domain in all affected records if not in preview mode
    const updatePromises = affectedPages.map(page => {
      const updates: Partial<LandingPage> = {};
      
      if (page.liveUrl && page.liveUrl.includes(oldDomain)) {
        updates.liveUrl = page.liveUrl.replace(new RegExp(oldDomain, 'g'), newDomain);
      }
      
      if (page.zipFileUrl && page.zipFileUrl.includes(oldDomain)) {
        updates.zipFileUrl = page.zipFileUrl.replace(new RegExp(oldDomain, 'g'), newDomain);
      }
      
      return db.update(landingPages)
        .set(updates)
        .where(eq(landingPages.id, page.id))
        .execute();
    });
    
    await Promise.all(updatePromises);
    
    // Log the domain change
    await this.createDomainChange({
      oldDomain,
      newDomain,
      changedBy: userId,
      recordsAffected: affectedPages.length
    });
    
    return { recordsAffected: affectedPages.length, affectedPages };
  }

  // Activity log methods
  async logActivity(activityLog: InsertActivityLog): Promise<ActivityLog> {
    const [newActivityLog] = await db
      .insert(activityLogs)
      .values(activityLog)
      .returning();
    return newActivityLog;
  }

  async getRecentActivity(limit = 5, userRole?: string, filterLandingPageOnly = false): Promise<any[]> {
    if (filterLandingPageOnly) {
      // For basic users, only return landing page create activities
      return db.query.activityLogs.findMany({
        limit,
        orderBy: desc(activityLogs.createdAt),
        with: {
          user: true
        },
        where: and(
          eq(activityLogs.action, "create"),
          eq(activityLogs.entityType, "landingPage")
        )
      });
    } else {
      // For admin users, return all activities
      return db.query.activityLogs.findMany({
        limit,
        orderBy: desc(activityLogs.createdAt),
        with: {
          user: true
        }
      });
    }
  }
  
  async getAllActivity(userRole?: string, filterLandingPageOnly = false): Promise<any[]> {
    if (filterLandingPageOnly) {
      // For basic users, only return landing page create activities
      return db.query.activityLogs.findMany({
        orderBy: desc(activityLogs.createdAt),
        with: {
          user: true
        },
        where: and(
          eq(activityLogs.action, "create"),
          eq(activityLogs.entityType, "landingPage")
        )
      });
    } else {
      // For admin users, return all activities
      return db.query.activityLogs.findMany({
        orderBy: desc(activityLogs.createdAt),
        with: {
          user: true
        }
      });
    }
  }

  // Stats methods
  async getDashboardStats(): Promise<{
    totalLandingPages: number;
    totalDownloads: number;
    categoriesCount: number;
    activeUsers: number;
  }> {
    // Get total landing pages
    const [landingPagesCount] = await db
      .select({ count: sql`count(*)` })
      .from(landingPages);
    
    // Get total downloads
    const [downloadsCount] = await db
      .select({ sum: sql`sum(${landingPages.downloadCount})` })
      .from(landingPages);
    
    // Get categories count
    const [categoriesCount] = await db
      .select({ count: sql`count(*)` })
      .from(categories);
    
    // Get active users (has been active in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [activeUsersCount] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(sql`${users.lastActive} > ${thirtyDaysAgo.toISOString()}`);
    
    return {
      totalLandingPages: Number(landingPagesCount.count) || 0,
      totalDownloads: Number(downloadsCount.sum) || 0,
      categoriesCount: Number(categoriesCount.count) || 0,
      activeUsers: Number(activeUsersCount.count) || 0
    };
  }

  async getCategoryBreakdown(): Promise<{ categoryName: string; percentage: number }[]> {
    try {
      // Get total landing pages count first
      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(landingPages);
      
      const totalCount = Number(totalCountResult.count);
      
      if (totalCount === 0) {
        return [];
      }
      
      // Get landing page counts by category - making sure to only include non-null categoryIds
      const landingPageCounts = await db
        .select({
          categoryId: landingPages.categoryId,
          count: sql<number>`count(*)`,
        })
        .from(landingPages)
        .where(sql`${landingPages.categoryId} IS NOT NULL`)
        .groupBy(landingPages.categoryId);
        
      if (landingPageCounts.length === 0) {
        return [];
      }
      
      // Get category names - extract valid category IDs
      const categoryIds = landingPageCounts
        .map(item => item.categoryId)
        .filter(id => id !== null && id !== undefined) as number[];
    
      if (categoryIds.length === 0) {
        return [];
      }
      
      // Fetch categories for the IDs we have
      let categoryList: any[] = [];
      
      // Fetch categories by id individually to avoid SQL array issues
      categoryList = await Promise.all(
        categoryIds.map(async (id) => {
          const [category] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, id));
          return category;
        })
      );
      
      // Filter out any undefined results
      categoryList = categoryList.filter(Boolean);
      
      // Create a map of category IDs to names
      const categoryMap = new Map<number, string>();
      categoryList.forEach(category => {
        categoryMap.set(category.id, category.name);
      });
      
      // Calculate percentages
      return landingPageCounts
        .filter(item => item.categoryId !== null)
        .map(item => ({
          categoryName: categoryMap.get(item.categoryId as number) || 'Uncategorized',
          percentage: Math.round((Number(item.count) / totalCount) * 100)
        }))
        .sort((a, b) => b.percentage - a.percentage);
    } catch (error) {
      console.error('Error in getCategoryBreakdown:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
