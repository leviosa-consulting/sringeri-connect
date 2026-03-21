import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, jsonb, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  page: text("page").notNull(),
  elementId: text("element_id"),
  elementText: text("element_text"),
  value: integer("value"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const analyticsDailySummary = pgTable("analytics_daily_summary", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  page: text("page").notNull(),
  uniqueUsers: integer("unique_users").default(0).notNull(),
  totalPageViews: integer("total_page_views").default(0).notNull(),
  totalClicks: integer("total_clicks").default(0).notNull(),
  avgScrollDepth: integer("avg_scroll_depth").default(0).notNull(),
  avgTimeSpent: integer("avg_time_spent").default(0).notNull(),
  topElements: jsonb("top_elements"),
}, (table) => [
  uniqueIndex("daily_summary_date_page_idx").on(table.date, table.page),
]);

export const insertAnalyticsEventSchema = z.object({
  userId: z.string().nullable().optional(),
  sessionId: z.string().min(1),
  eventType: z.enum(["page_view", "click", "scroll", "time_spent"]),
  page: z.string().min(1),
  elementId: z.string().nullable().optional(),
  elementText: z.string().max(200).nullable().optional(),
  value: z.number().int().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type AnalyticsDailySummary = typeof analyticsDailySummary.$inferSelect;
