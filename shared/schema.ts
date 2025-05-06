import { pgTable, text, serial, integer, boolean, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enum for user roles
export const roleEnum = pgEnum('role', ['admin', 'basic']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull().default('basic'),
  lastActive: timestamp("last_active").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

// Landing pages table
export const landingPages = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  mainHeadline: text("main_headline"),
  liveUrl: text("live_url"),
  screenshotUrl: text("screenshot_url"),
  zipFileUrl: text("zip_file_url"),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Domain changes table for audit
export const domainChanges = pgTable("domain_changes", {
  id: serial("id").primaryKey(),
  oldDomain: text("old_domain").notNull(),
  newDomain: text("new_domain").notNull(),
  recordsAffected: integer("records_affected").default(0),
  changedBy: integer("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
});

// Activity log table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  landingPages: many(landingPages, { relationName: "createdLandingPages" }),
  domainChanges: many(domainChanges, { relationName: "userDomainChanges" }),
  activityLogs: many(activityLogs, { relationName: "userActivityLogs" }),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  landingPages: many(landingPages, { relationName: "categoryLandingPages" }),
}));

export const landingPageRelations = relations(landingPages, ({ one }) => ({
  category: one(categories, {
    fields: [landingPages.categoryId],
    references: [categories.id],
    relationName: "categoryLandingPages",
  }),
  creator: one(users, {
    fields: [landingPages.createdBy],
    references: [users.id],
    relationName: "createdLandingPages",
  }),
}));

export const domainChangeRelations = relations(domainChanges, ({ one }) => ({
  user: one(users, {
    fields: [domainChanges.changedBy],
    references: [users.id],
    relationName: "userDomainChanges",
  }),
}));

export const activityLogRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
    relationName: "userActivityLogs",
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastActive: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertLandingPageSchema = createInsertSchema(landingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloadCount: true,
});

export const insertDomainChangeSchema = createInsertSchema(domainChanges).omit({
  id: true,
  changedAt: true,
  recordsAffected: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type LandingPage = typeof landingPages.$inferSelect;
export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;

export type DomainChange = typeof domainChanges.$inferSelect;
export type InsertDomainChange = z.infer<typeof insertDomainChangeSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
