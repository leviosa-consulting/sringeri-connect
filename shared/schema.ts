import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, jsonb, timestamp, date, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";
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

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  videoUrl: text("video_url"),
  audioUrl: text("audio_url"),
  imageUrls: text("image_urls").array(),
  publishDate: date("publish_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  groupName: text("group_name"),
  episodeNumber: integer("episode_number"),
  showInUpcoming: boolean("show_in_upcoming").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("quizzes_publish_date_idx").on(table.publishDate),
  index("quizzes_group_name_idx").on(table.groupName),
]);

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull().$type<{ text: string; isCorrect: boolean }[]>(),
  correctCount: integer("correct_count").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  odUserId: text("od_user_id").notNull(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answers: jsonb("answers").notNull().$type<Record<string, number[]>>(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("quiz_attempts_user_quiz_idx").on(table.odUserId, table.quizId),
  index("quiz_attempts_user_completed_idx").on(table.odUserId, table.completedAt),
]);

export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({ id: true });
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({ id: true, completedAt: true });
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  odUserId: text("od_user_id").notNull(),
  badgeId: text("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_badges_user_badge_idx").on(table.odUserId, table.badgeId),
  index("user_badges_user_idx").on(table.odUserId),
]);

export type UserBadge = typeof userBadges.$inferSelect;

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  odUserId: text("od_user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  adminReply: text("admin_reply"),
  status: text("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  repliedAt: timestamp("replied_at"),
}, (table) => [
  index("support_messages_user_type_idx").on(table.odUserId, table.type),
  index("support_messages_status_idx").on(table.status),
]);

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true, adminReply: true, repliedAt: true, status: true });
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

// ---------------------------------------------------------------------------
// Live Chat: one thread per visitor that starts with the AI bot, can be
// escalated to a human agent, and falls back to an emailed concern when no
// agent is online.
// ---------------------------------------------------------------------------

/** bot -> waiting (agent requested) -> live (agent joined) | offline_pending (emailed) -> closed */
export const CHAT_STATUSES = ["bot", "waiting", "live", "offline_pending", "closed"] as const;
export type ChatStatus = (typeof CHAT_STATUSES)[number];

/** Who wrote a line in the transcript. "system" lines are status notices. */
export const CHAT_AUTHORS = ["user", "bot", "agent", "system"] as const;
export type ChatAuthor = (typeof CHAT_AUTHORS)[number];

export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  /** Client-generated secret held in localStorage; also the bearer for anonymous threads. */
  visitorId: text("visitor_id").notNull(),
  odUserId: text("od_user_id"),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  status: text("status").$type<ChatStatus>().default("bot").notNull(),
  /** "app" today; task #152 will add the embedded website source. */
  source: text("source").default("app").notNull(),
  assignedAgentUid: text("assigned_agent_uid"),
  assignedAgentName: text("assigned_agent_name"),
  unreadForAgent: integer("unread_for_agent").default(0).notNull(),
  unreadForVisitor: integer("unread_for_visitor").default(0).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
}, (table) => [
  index("chat_conversations_visitor_idx").on(table.visitorId),
  index("chat_conversations_status_idx").on(table.status),
  index("chat_conversations_last_message_idx").on(table.lastMessageAt),
]);

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  author: text("author").$type<ChatAuthor>().notNull(),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chat_messages_conversation_idx").on(table.conversationId, table.id),
]);

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/** Agent presence is a single manual toggle, stored in appSettings. */
export const CHAT_PRESENCE_KEY = "live_chat_agent_online";
export const CHAT_PRESENCE_NAME_KEY = "live_chat_agent_name";
export const CHAT_PRESENCE_UPDATED_KEY = "live_chat_presence_updated_at";

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

export const reconciliationLogs = pgTable("reconciliation_logs", {
  id: serial("id").primaryKey(),
  ranAt: timestamp("ran_at").defaultNow().notNull(),
  checkedCount: integer("checked_count").default(0).notNull(),
  ackedCount: integer("acked_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  pendingCount: integer("pending_count").default(0).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  details: jsonb("details").$type<ReconciliationDetail[]>().default([]).notNull(),
}, (table) => [
  index("reconciliation_logs_ran_at_idx").on(table.ranAt),
]);

export interface ReconciliationDetail {
  orderId: string;
  type?: string;
  paytmStatus: string;
  outcome: "acked" | "marked_failed" | "pending" | "error";
  error?: string;
  txnAmount?: string;
  txnId?: string;
}

export type ReconciliationLog = typeof reconciliationLogs.$inferSelect;
export type InsertReconciliationLog = typeof reconciliationLogs.$inferInsert;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  uid: text("uid").notNull(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const adminRoles = pgTable("admin_roles", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  grantedByUid: text("granted_by_uid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("admin_roles_uid_role_idx").on(table.firebaseUid, table.role),
  index("admin_roles_uid_idx").on(table.firebaseUid),
]);

export const insertAdminRoleSchema = createInsertSchema(adminRoles).omit({ id: true, createdAt: true });
export type InsertAdminRole = z.infer<typeof insertAdminRoleSchema>;
export type AdminRole = typeof adminRoles.$inferSelect;

// ---------------------------------------------------------------------------
// Daily devotee practice: Guruvani reflection, Question of the Day,
// Activity of the Day, and the Dharma Points ledger that backs them.
// ---------------------------------------------------------------------------

export const dailyGuruvani = pgTable("daily_guruvani", {
  id: serial("id").primaryKey(),
  contentDate: date("content_date").notNull(),
  quote: text("quote").notNull(),
  attribution: text("attribution"),
  points: integer("points").default(2).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_guruvani_date_idx").on(table.contentDate),
]);

export const dailyQuestions = pgTable("daily_questions", {
  id: serial("id").primaryKey(),
  contentDate: date("content_date").notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctIndex: integer("correct_index").notNull(),
  points: integer("points").default(1).notNull(),
  explanation: text("explanation"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_questions_date_idx").on(table.contentDate),
]);

/**
 * answerMode "options" -> devotee picks one of `options` (correctIndex decides).
 * answerMode "text"    -> devotee types an answer (correctAnswer decides,
 *                         compared case- and whitespace-insensitively).
 * Either mode may carry an imageUrl, which covers picture puzzles.
 */
export const dailyActivities = pgTable("daily_activities", {
  id: serial("id").primaryKey(),
  contentDate: date("content_date").notNull(),
  activityType: text("activity_type").default("anagram").notNull(),
  answerMode: text("answer_mode").default("text").notNull(),
  instructions: text("instructions"),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url"),
  options: jsonb("options").$type<string[]>(),
  correctIndex: integer("correct_index"),
  correctAnswer: text("correct_answer"),
  points: integer("points").default(2).notNull(),
  explanation: text("explanation"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_activities_date_idx").on(table.contentDate),
]);

export const dailyReflections = pgTable("daily_reflections", {
  id: serial("id").primaryKey(),
  odUserId: text("od_user_id").notNull(),
  contentDate: date("content_date").notNull(),
  guruvaniId: integer("guruvani_id"),
  reflectionText: text("reflection_text").notNull(),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_reflections_user_date_idx").on(table.odUserId, table.contentDate),
  index("daily_reflections_date_idx").on(table.contentDate),
]);

export const dailyQuestionResponses = pgTable("daily_question_responses", {
  id: serial("id").primaryKey(),
  odUserId: text("od_user_id").notNull(),
  contentDate: date("content_date").notNull(),
  questionId: integer("question_id").notNull().references(() => dailyQuestions.id, { onDelete: "cascade" }),
  selectedIndex: integer("selected_index").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_question_responses_user_date_idx").on(table.odUserId, table.contentDate),
  index("daily_question_responses_date_idx").on(table.contentDate),
]);

export const dailyActivityResponses = pgTable("daily_activity_responses", {
  id: serial("id").primaryKey(),
  odUserId: text("od_user_id").notNull(),
  contentDate: date("content_date").notNull(),
  activityId: integer("activity_id").notNull().references(() => dailyActivities.id, { onDelete: "cascade" }),
  submittedAnswer: text("submitted_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_activity_responses_user_date_idx").on(table.odUserId, table.contentDate),
  index("daily_activity_responses_date_idx").on(table.contentDate),
]);

/**
 * Append-only ledger. A devotee's balance is the sum of their rows; the unique
 * index makes a second award for the same source on the same date impossible.
 */
export const dharmaPoints = pgTable("dharma_points", {
  id: serial("id").primaryKey(),
  odUserId: text("od_user_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceDate: date("source_date").notNull(),
  sourceId: integer("source_id"),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("dharma_points_user_source_idx").on(table.odUserId, table.sourceType, table.sourceDate),
  index("dharma_points_user_idx").on(table.odUserId),
]);

export type DailyGuruvani = typeof dailyGuruvani.$inferSelect;
export type DailyQuestion = typeof dailyQuestions.$inferSelect;
export type DailyActivity = typeof dailyActivities.$inferSelect;
export type DailyReflection = typeof dailyReflections.$inferSelect;
export type DailyQuestionResponse = typeof dailyQuestionResponses.$inferSelect;
export type DailyActivityResponse = typeof dailyActivityResponses.$inferSelect;
export type DharmaPointsEntry = typeof dharmaPoints.$inferSelect;

export type InsertDailyGuruvani = typeof dailyGuruvani.$inferInsert;
export type InsertDailyQuestion = typeof dailyQuestions.$inferInsert;
export type InsertDailyActivity = typeof dailyActivities.$inferInsert;

export const DHARMA_SOURCE_GURUVANI = "guruvani_reflection";
export const DHARMA_SOURCE_QUESTION = "question_of_day";
export const DHARMA_SOURCE_ACTIVITY = "activity_of_day";
