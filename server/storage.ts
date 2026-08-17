import { chatConversations, chatMessages, type ChatConversation, type InsertChatConversation, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { type User, type InsertUser, type InsertAnalyticsEvent, analyticsEvents, analyticsDailySummary, quizzes, quizQuestions, quizAttempts, userBadges, appSettings, supportMessages, reconciliationLogs, passwordResetTokens, adminRoles, type InsertQuiz, type Quiz, type InsertQuizQuestion, type QuizQuestion, type InsertQuizAttempt, type QuizAttempt, type UserBadge, type InsertSupportMessage, type SupportMessage, type ReconciliationLog, type InsertReconciliationLog, type PasswordResetToken, type AdminRole, dailyGuruvani, dailyQuestions, dailyActivities, dailyReflections, dailyQuestionResponses, dailyActivityResponses, dharmaPoints, DHARMA_SOURCE_GURUVANI, DHARMA_SOURCE_QUESTION, DHARMA_SOURCE_ACTIVITY, type DailyQuestion, type DailyActivity, type DailyReflection, type DailyQuestionResponse, type DailyActivityResponse, type DharmaPointsEntry, type InsertDailyQuestion, type InsertDailyActivity } from "@shared/schema";
import { normalizeDailyAnswer, normalizeAnagramAnswer } from "@shared/daily-grading";
import { getGuruvaniForDate } from "@shared/guruvani";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, and, gte, lte, desc, asc, count, countDistinct, avg } from "drizzle-orm";
import pg from "pg";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  insertAnalyticsEvents(events: InsertAnalyticsEvent[]): Promise<void>;
  getAnalyticsSummary(from: string, to: string, page?: string): Promise<any[]>;
  getTopElements(from: string, to: string, page?: string, limit?: number): Promise<any[]>;
  getPageStats(from: string, to: string): Promise<any[]>;
  getLiveSessionCount(): Promise<number>;
  aggregateDailySummary(dateStr: string): Promise<void>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: number, quiz: Partial<InsertQuiz>): Promise<Quiz | undefined>;
  deleteQuiz(id: number): Promise<void>;
  getQuizById(id: number): Promise<Quiz | undefined>;
  getQuizByDate(dateStr: string): Promise<Quiz | undefined>;
  listQuizzes(): Promise<Quiz[]>;
  createQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  updateQuestion(id: number, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined>;
  deleteQuestion(id: number): Promise<void>;
  getQuestionsByQuizId(quizId: number): Promise<QuizQuestion[]>;
  deleteQuestionsByQuizId(quizId: number): Promise<void>;
  saveAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getAttemptByUserAndQuiz(odUserId: string, quizId: number): Promise<QuizAttempt | undefined>;
  getUserAttemptHistory(odUserId: string, limit?: number): Promise<(QuizAttempt & { quizTitle: string; quizPublishDate: string })[]>;
  getUserBadges(odUserId: string): Promise<UserBadge[]>;
  awardBadge(odUserId: string, badgeId: string): Promise<UserBadge | null>;
  getUserAttemptDates(odUserId: string): Promise<string[]>;
  hasUserPerfectScore(odUserId: string): Promise<boolean>;
  getUserAttemptCount(odUserId: string): Promise<number>;
  getQuizAnalyticsSummary(): Promise<{ totalAttempts: number; uniqueUsers: number; avgScore: number; perfectScores: number }>;
  getQuizAnalyticsPerQuiz(): Promise<{ quizId: number; title: string; publishDate: string; attempts: number; avgScore: number; perfectScores: number }[]>;
  getQuizAnalyticsAttempts(page: number, limit: number): Promise<{ attempts: { id: number; odUserId: string; quizTitle: string; quizPublishDate: string; score: number; totalQuestions: number; completedAt: Date }[]; total: number }>;
  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;
  tryCronClaim(key: string, windowMinutes: number): Promise<boolean>;
  deleteUserData(odUserId: string): Promise<void>;
  createSupportMessage(msg: InsertSupportMessage): Promise<SupportMessage>;
  listUserSupportMessages(odUserId: string, type: string): Promise<SupportMessage[]>;
  listAllSupportMessages(type?: string, status?: string): Promise<SupportMessage[]>;
  getSupportMessage(id: number): Promise<SupportMessage | undefined>;
  replySupportMessage(id: number, reply: string): Promise<SupportMessage>;
  createChatConversation(data: InsertChatConversation): Promise<ChatConversation>;
  getChatConversation(id: number): Promise<ChatConversation | undefined>;
  getActiveChatConversationForVisitor(visitorId: string): Promise<ChatConversation | undefined>;
  listChatConversations(status?: string, limit?: number): Promise<ChatConversation[]>;
  updateChatConversation(id: number, patch: Partial<InsertChatConversation>): Promise<ChatConversation | undefined>;
  appendChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  listChatMessages(conversationId: number, sinceId?: number): Promise<ChatMessage[]>;
  /** Atomic counter bump so concurrent messages cannot lose an increment. */
  bumpChatUnread(id: number, side: "agent" | "visitor", by?: number): Promise<void>;
  clearChatUnread(id: number, side: "agent" | "visitor"): Promise<void>;
  insertReconciliationLog(log: InsertReconciliationLog): Promise<ReconciliationLog>;
  getReconciliationLogs(from: Date, to: Date): Promise<ReconciliationLog[]>;
  createPasswordResetToken(token: string, uid: string, email: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  getAdminRolesForUser(firebaseUid: string): Promise<string[]>;
  listAllAdminRoles(): Promise<AdminRole[]>;
  grantAdminRole(firebaseUid: string, email: string, role: string, grantedByUid: string): Promise<AdminRole>;
  revokeAdminRole(id: number): Promise<void>;

  // --- Daily practice content (admin-scheduled, one item per date) ---
  getDailyQuestion(dateStr: string): Promise<DailyQuestion | undefined>;
  getDailyActivity(dateStr: string): Promise<DailyActivity | undefined>;
  upsertDailyQuestion(data: InsertDailyQuestion): Promise<DailyQuestion>;
  upsertDailyActivity(data: InsertDailyActivity): Promise<DailyActivity>;
  deleteDailyQuestion(dateStr: string): Promise<void>;
  deleteDailyActivity(dateStr: string): Promise<void>;
  listDailyContentDates(limit?: number): Promise<DailyContentDateRow[]>;

  // --- Devotee submissions (private to the devotee and admins) ---
  getDailyReflection(odUserId: string, dateStr: string): Promise<DailyReflection | undefined>;
  getDailyQuestionResponse(odUserId: string, dateStr: string): Promise<DailyQuestionResponse | undefined>;
  getDailyActivityResponse(odUserId: string, dateStr: string): Promise<DailyActivityResponse | undefined>;
  saveDailyQuestionIfUnanswered(data: InsertDailyQuestion): Promise<DailyContentSaveResult>;
  saveDailyActivityIfUnanswered(data: InsertDailyActivity): Promise<DailyContentSaveResult>;
  deleteDailyQuestionIfUnanswered(dateStr: string): Promise<DailyContentSaveResult>;
  deleteDailyActivityIfUnanswered(dateStr: string): Promise<DailyContentSaveResult>;
  countDailyQuestionResponses(dateStr: string): Promise<number>;
  countDailyActivityResponses(dateStr: string): Promise<number>;
  submitDailyReflection(odUserId: string, dateStr: string, guruvaniId: number | null, reflectionText: string, points: number): Promise<DailyReflection | null>;
  gradeDailyQuestion(odUserId: string, dateStr: string, selectedIndex: number): Promise<DailyGradeResult<DailyQuestionResponse, DailyQuestion>>;
  gradeDailyActivity(odUserId: string, dateStr: string, input: DailyAnswerInput): Promise<DailyGradeResult<DailyActivityResponse, DailyActivity>>;

  // --- Dharma Points ledger ---
  getDharmaPointsSummary(odUserId: string, dateStr: string): Promise<{ total: number; today: number }>;
  listDharmaAwards(odUserId: string, limit?: number): Promise<DharmaPointsEntry[]>;
  listDailyHistory(odUserId: string, limit?: number): Promise<DailyHistory>;
  listDailySubmissionsForDate(dateStr: string): Promise<DailyHistory>;
  // Dates on which a devotee completed all three of Guruvani reflection,
  // Question of the Day and Activity of the Day — the unit the Daily
  // Practice streak counts, deliberately separate from the older quiz streak.
  getDailyPracticeCompletionDates(odUserId: string): Promise<string[]>;
}

/**
 * Grading happens inside the same transaction that locks the scheduled item, so
 * these results describe every way a submission can end.
 */
export type DailyGradeResult<TResponse, TContent> =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "duplicate" }
  | { status: "graded"; response: TResponse; content: TContent };

export interface DailyAnswerInput {
  /** Chosen option, for multiple-choice items. */
  selectedIndex?: number;
  /** Typed answer, for free-text activities. */
  answer?: string;
}

/** Scheduled items freeze once a devotee has responded to them. */
export type DailyContentSaveResult = "saved" | "frozen";

export interface DailyContentDateRow {
  contentDate: string;
  hasQuestion: boolean;
  hasActivity: boolean;
}

export interface DailyHistory {
  reflections: (DailyReflection & { quote: string | null })[];
  questions: (DailyQuestionResponse & { questionText: string; options: string[]; correctIndex: number })[];
  activities: (DailyActivityResponse & { prompt: string; correctAnswer: string | null })[];
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async insertAnalyticsEvents(_events: InsertAnalyticsEvent[]): Promise<void> {}
  async getAnalyticsSummary(_from: string, _to: string, _page?: string): Promise<any[]> { return []; }
  async getTopElements(_from: string, _to: string, _page?: string, _limit?: number): Promise<any[]> { return []; }
  async getPageStats(_from: string, _to: string): Promise<any[]> { return []; }
  async getLiveSessionCount(): Promise<number> { return 0; }
  async aggregateDailySummary(_dateStr: string): Promise<void> {}
  async createQuiz(_quiz: InsertQuiz): Promise<Quiz> { throw new Error("Not implemented"); }
  async updateQuiz(_id: number, _quiz: Partial<InsertQuiz>): Promise<Quiz | undefined> { return undefined; }
  async deleteQuiz(_id: number): Promise<void> {}
  async getQuizById(_id: number): Promise<Quiz | undefined> { return undefined; }
  async getQuizByDate(_dateStr: string): Promise<Quiz | undefined> { return undefined; }
  async listQuizzes(): Promise<Quiz[]> { return []; }
  async createQuestion(_question: InsertQuizQuestion): Promise<QuizQuestion> { throw new Error("Not implemented"); }
  async updateQuestion(_id: number, _question: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined> { return undefined; }
  async deleteQuestion(_id: number): Promise<void> {}
  async getQuestionsByQuizId(_quizId: number): Promise<QuizQuestion[]> { return []; }
  async deleteQuestionsByQuizId(_quizId: number): Promise<void> {}
  async saveAttempt(_attempt: InsertQuizAttempt): Promise<QuizAttempt> { throw new Error("Not implemented"); }
  async getAttemptByUserAndQuiz(_odUserId: string, _quizId: number): Promise<QuizAttempt | undefined> { return undefined; }
  async getUserAttemptHistory(_odUserId: string, _limit?: number): Promise<(QuizAttempt & { quizTitle: string; quizPublishDate: string })[]> { return []; }
  async getUserBadges(_odUserId: string): Promise<UserBadge[]> { return []; }
  async awardBadge(_odUserId: string, _badgeId: string): Promise<UserBadge | null> { return null; }
  async getUserAttemptDates(_odUserId: string): Promise<string[]> { return []; }
  async hasUserPerfectScore(_odUserId: string): Promise<boolean> { return false; }
  async getUserAttemptCount(_odUserId: string): Promise<number> { return 0; }
  async getQuizAnalyticsSummary(): Promise<{ totalAttempts: number; uniqueUsers: number; avgScore: number; perfectScores: number }> { return { totalAttempts: 0, uniqueUsers: 0, avgScore: 0, perfectScores: 0 }; }
  async getQuizAnalyticsPerQuiz(): Promise<{ quizId: number; title: string; publishDate: string; attempts: number; avgScore: number; perfectScores: number }[]> { return []; }
  async getQuizAnalyticsAttempts(_page: number, _limit: number): Promise<{ attempts: { id: number; odUserId: string; quizTitle: string; quizPublishDate: string; score: number; totalQuestions: number; completedAt: Date }[]; total: number }> { return { attempts: [], total: 0 }; }
  async getAppSetting(_key: string): Promise<string | null> { return null; }
  async setAppSetting(_key: string, _value: string): Promise<void> {}
  async tryCronClaim(_key: string, _windowMinutes: number): Promise<boolean> { return true; }
  async deleteUserData(_odUserId: string): Promise<void> {}
  private supportMsgs: SupportMessage[] = [];
  private supportMsgIdCounter = 1;
  async createSupportMessage(msg: InsertSupportMessage): Promise<SupportMessage> {
    const record: SupportMessage = { id: this.supportMsgIdCounter++, type: msg.type, odUserId: msg.odUserId || null, name: msg.name, email: msg.email, phone: msg.phone || null, subject: msg.subject, message: msg.message, adminReply: null, status: "open", createdAt: new Date(), repliedAt: null };
    this.supportMsgs.push(record);
    return record;
  }
  async listUserSupportMessages(odUserId: string, type: string): Promise<SupportMessage[]> { return this.supportMsgs.filter(m => m.odUserId === odUserId && m.type === type).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
  async listAllSupportMessages(type?: string, status?: string): Promise<SupportMessage[]> {
    return this.supportMsgs.filter(m => (!type || m.type === type) && (!status || m.status === status)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async getSupportMessage(id: number): Promise<SupportMessage | undefined> { return this.supportMsgs.find(m => m.id === id); }

  private chatConvos: ChatConversation[] = [];
  private chatConvoIdCounter = 1;
  private chatMsgs: ChatMessage[] = [];
  private chatMsgIdCounter = 1;

  async createChatConversation(data: InsertChatConversation): Promise<ChatConversation> {
    const now = new Date();
    const record: ChatConversation = {
      id: this.chatConvoIdCounter++,
      visitorId: data.visitorId,
      odUserId: data.odUserId ?? null,
      name: data.name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      status: data.status ?? "bot",
      source: data.source ?? "app",
      pageUrl: data.pageUrl ?? null,
      pageTitle: data.pageTitle ?? null,
      assignedAgentUid: data.assignedAgentUid ?? null,
      assignedAgentName: data.assignedAgentName ?? null,
      unreadForAgent: data.unreadForAgent ?? 0,
      unreadForVisitor: data.unreadForVisitor ?? 0,
      lastMessageAt: now,
      createdAt: now,
      closedAt: null,
    };
    this.chatConvos.push(record);
    return record;
  }

  async getChatConversation(id: number): Promise<ChatConversation | undefined> {
    return this.chatConvos.find(c => c.id === id);
  }

  async getActiveChatConversationForVisitor(visitorId: string): Promise<ChatConversation | undefined> {
    return this.chatConvos
      .filter(c => c.visitorId === visitorId && c.status !== "closed")
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())[0];
  }

  async listChatConversations(status?: string, limit = 100): Promise<ChatConversation[]> {
    return this.chatConvos
      .filter(c => !status || c.status === status)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .slice(0, limit);
  }

  async updateChatConversation(id: number, patch: Partial<InsertChatConversation>): Promise<ChatConversation | undefined> {
    const convo = this.chatConvos.find(c => c.id === id);
    if (!convo) return undefined;
    Object.assign(convo, patch);
    return convo;
  }

  async appendChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const record: ChatMessage = {
      id: this.chatMsgIdCounter++,
      conversationId: msg.conversationId,
      author: msg.author,
      authorName: msg.authorName ?? null,
      content: msg.content,
      createdAt: new Date(),
    };
    this.chatMsgs.push(record);
    const convo = this.chatConvos.find(c => c.id === msg.conversationId);
    if (convo) convo.lastMessageAt = record.createdAt;
    return record;
  }

  async listChatMessages(conversationId: number, sinceId = 0): Promise<ChatMessage[]> {
    return this.chatMsgs
      .filter(m => m.conversationId === conversationId && m.id > sinceId)
      .sort((a, b) => a.id - b.id);
  }

  async bumpChatUnread(id: number, side: "agent" | "visitor", by = 1): Promise<void> {
    const convo = this.chatConvos.find(c => c.id === id);
    if (!convo) return;
    if (side === "agent") convo.unreadForAgent += by;
    else convo.unreadForVisitor += by;
  }

  async clearChatUnread(id: number, side: "agent" | "visitor"): Promise<void> {
    const convo = this.chatConvos.find(c => c.id === id);
    if (!convo) return;
    if (side === "agent") convo.unreadForAgent = 0;
    else convo.unreadForVisitor = 0;
  }
  async insertReconciliationLog(_log: InsertReconciliationLog): Promise<ReconciliationLog> { throw new Error("Not implemented"); }
  async getReconciliationLogs(_from: Date, _to: Date): Promise<ReconciliationLog[]> { return []; }
  private _resetTokens = new Map<string, PasswordResetToken>();
  async createPasswordResetToken(token: string, uid: string, email: string, expiresAt: Date): Promise<void> {
    this._resetTokens.set(token, { id: Date.now(), token, uid, email, expiresAt, createdAt: new Date() });
  }
  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return this._resetTokens.get(token);
  }
  async deletePasswordResetToken(token: string): Promise<void> { this._resetTokens.delete(token); }
  async deleteExpiredPasswordResetTokens(): Promise<void> {
    const now = new Date();
    for (const [k, v] of this._resetTokens) { if (v.expiresAt < now) this._resetTokens.delete(k); }
  }
  async replySupportMessage(id: number, reply: string): Promise<SupportMessage> {
    const msg = this.supportMsgs.find(m => m.id === id);
    if (!msg) throw new Error("Not found");
    msg.adminReply = reply; msg.status = "replied"; msg.repliedAt = new Date();
    return msg;
  }
  private _adminRoles: AdminRole[] = [];
  private _adminRoleIdCounter = 1;
  async getAdminRolesForUser(firebaseUid: string): Promise<string[]> {
    return this._adminRoles.filter(r => r.firebaseUid === firebaseUid).map(r => r.role);
  }
  async listAllAdminRoles(): Promise<AdminRole[]> {
    return [...this._adminRoles].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async grantAdminRole(firebaseUid: string, email: string, role: string, grantedByUid: string): Promise<AdminRole> {
    const existing = this._adminRoles.find(r => r.firebaseUid === firebaseUid && r.role === role);
    if (existing) return existing;
    const record: AdminRole = { id: this._adminRoleIdCounter++, firebaseUid, email, role, grantedByUid, createdAt: new Date() };
    this._adminRoles.push(record);
    return record;
  }
  async revokeAdminRole(id: number): Promise<void> {
    this._adminRoles = this._adminRoles.filter(r => r.id !== id);
  }

  async getDailyQuestion(_dateStr: string): Promise<DailyQuestion | undefined> { return undefined; }
  async getDailyActivity(_dateStr: string): Promise<DailyActivity | undefined> { return undefined; }
  async upsertDailyQuestion(_data: InsertDailyQuestion): Promise<DailyQuestion> { throw new Error("Not implemented"); }
  async upsertDailyActivity(_data: InsertDailyActivity): Promise<DailyActivity> { throw new Error("Not implemented"); }
  async deleteDailyQuestion(_dateStr: string): Promise<void> {}
  async deleteDailyActivity(_dateStr: string): Promise<void> {}
  async listDailyContentDates(_limit?: number): Promise<DailyContentDateRow[]> { return []; }
  async getDailyReflection(_odUserId: string, _dateStr: string): Promise<DailyReflection | undefined> { return undefined; }
  async getDailyQuestionResponse(_odUserId: string, _dateStr: string): Promise<DailyQuestionResponse | undefined> { return undefined; }
  async getDailyActivityResponse(_odUserId: string, _dateStr: string): Promise<DailyActivityResponse | undefined> { return undefined; }
  async saveDailyQuestionIfUnanswered(_data: InsertDailyQuestion): Promise<DailyContentSaveResult> { throw new Error("Not implemented"); }
  async saveDailyActivityIfUnanswered(_data: InsertDailyActivity): Promise<DailyContentSaveResult> { throw new Error("Not implemented"); }
  async deleteDailyQuestionIfUnanswered(_dateStr: string): Promise<DailyContentSaveResult> { return "saved"; }
  async deleteDailyActivityIfUnanswered(_dateStr: string): Promise<DailyContentSaveResult> { return "saved"; }
  async countDailyQuestionResponses(_dateStr: string): Promise<number> { return 0; }
  async countDailyActivityResponses(_dateStr: string): Promise<number> { return 0; }
  async submitDailyReflection(_odUserId: string, _dateStr: string, _guruvaniId: number | null, _reflectionText: string, _points: number): Promise<DailyReflection | null> { throw new Error("Not implemented"); }
  async gradeDailyQuestion(_odUserId: string, _dateStr: string, _selectedIndex: number): Promise<DailyGradeResult<DailyQuestionResponse, DailyQuestion>> { return { status: "missing" }; }
  async gradeDailyActivity(_odUserId: string, _dateStr: string, _input: DailyAnswerInput): Promise<DailyGradeResult<DailyActivityResponse, DailyActivity>> { return { status: "missing" }; }
  async getDharmaPointsSummary(_odUserId: string, _dateStr: string): Promise<{ total: number; today: number }> { return { total: 0, today: 0 }; }
  async listDharmaAwards(_odUserId: string, _limit?: number): Promise<DharmaPointsEntry[]> { return []; }
  async listDailyHistory(_odUserId: string, _limit?: number): Promise<DailyHistory> { return { reflections: [], questions: [], activities: [] }; }
  async listDailySubmissionsForDate(_dateStr: string): Promise<DailyHistory> { return { reflections: [], questions: [], activities: [] }; }
  async getDailyPracticeCompletionDates(_odUserId: string): Promise<string[]> { return []; }
}

let storage: IStorage;

if (process.env.DATABASE_URL) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  class PgStorage extends MemStorage {
    async insertAnalyticsEvents(events: InsertAnalyticsEvent[]): Promise<void> {
      if (events.length === 0) return;
      const rows = events.map(e => ({
        userId: e.userId || null,
        sessionId: e.sessionId,
        eventType: e.eventType,
        page: e.page,
        elementId: e.elementId || null,
        elementText: e.elementText ? e.elementText.slice(0, 200) : null,
        value: e.value ?? null,
        metadata: e.metadata || null,
      }));
      await db.insert(analyticsEvents).values(rows);
    }

    async getAnalyticsSummary(from: string, to: string, page?: string): Promise<any[]> {
      const conditions = [
        gte(analyticsDailySummary.date, from),
        lte(analyticsDailySummary.date, to),
      ];
      if (page) conditions.push(eq(analyticsDailySummary.page, page));

      return db.select().from(analyticsDailySummary)
        .where(and(...conditions))
        .orderBy(desc(analyticsDailySummary.date));
    }

    async getTopElements(from: string, to: string, page?: string, limitNum: number = 20): Promise<any[]> {
      const conditions: any[] = [
        eq(analyticsEvents.eventType, 'click'),
        gte(analyticsEvents.createdAt, new Date(from)),
        lte(analyticsEvents.createdAt, new Date(to + 'T23:59:59Z')),
      ];
      if (page) conditions.push(eq(analyticsEvents.page, page));

      const result = await db.select({
        elementId: analyticsEvents.elementId,
        elementText: analyticsEvents.elementText,
        page: analyticsEvents.page,
        clickCount: count(),
      }).from(analyticsEvents)
        .where(and(...conditions))
        .groupBy(analyticsEvents.elementId, analyticsEvents.elementText, analyticsEvents.page)
        .orderBy(desc(count()))
        .limit(limitNum);

      return result;
    }

    async getPageStats(from: string, to: string): Promise<any[]> {
      const conditions = [
        eq(analyticsEvents.eventType, 'page_view'),
        gte(analyticsEvents.createdAt, new Date(from)),
        lte(analyticsEvents.createdAt, new Date(to + 'T23:59:59Z')),
      ];

      const result = await db.select({
        page: analyticsEvents.page,
        views: count(),
        uniqueUsers: countDistinct(analyticsEvents.userId),
      }).from(analyticsEvents)
        .where(and(...conditions))
        .groupBy(analyticsEvents.page)
        .orderBy(desc(count()));

      const scrollStats = await db.select({
        page: analyticsEvents.page,
        avgScroll: avg(analyticsEvents.value),
      }).from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.eventType, 'scroll'),
          gte(analyticsEvents.createdAt, new Date(from)),
          lte(analyticsEvents.createdAt, new Date(to + 'T23:59:59Z')),
        ))
        .groupBy(analyticsEvents.page);

      const timeStats = await db.select({
        page: analyticsEvents.page,
        avgTime: avg(analyticsEvents.value),
      }).from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.eventType, 'time_spent'),
          gte(analyticsEvents.createdAt, new Date(from)),
          lte(analyticsEvents.createdAt, new Date(to + 'T23:59:59Z')),
        ))
        .groupBy(analyticsEvents.page);

      const scrollMap = new Map(scrollStats.map(s => [s.page, Math.round(Number(s.avgScroll) || 0)]));
      const timeMap = new Map(timeStats.map(s => [s.page, Math.round(Number(s.avgTime) || 0)]));

      return result.map(r => ({
        ...r,
        avgScrollDepth: scrollMap.get(r.page) || 0,
        avgTimeSpent: timeMap.get(r.page) || 0,
      }));
    }

    async getLiveSessionCount(): Promise<number> {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = await db.select({
        count: countDistinct(analyticsEvents.sessionId),
      }).from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, fiveMinAgo));

      return result[0]?.count || 0;
    }

    async aggregateDailySummary(dateStr: string): Promise<void> {
      const startDate = new Date(dateStr);
      const endDate = new Date(dateStr + 'T23:59:59Z');

      const pages = await db.selectDistinct({ page: analyticsEvents.page })
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, startDate),
          lte(analyticsEvents.createdAt, endDate),
        ));

      for (const { page } of pages) {
        const pvResult = await db.select({
          views: count(),
          uniqueUsers: countDistinct(analyticsEvents.userId),
        }).from(analyticsEvents)
          .where(and(
            eq(analyticsEvents.eventType, 'page_view'),
            eq(analyticsEvents.page, page),
            gte(analyticsEvents.createdAt, startDate),
            lte(analyticsEvents.createdAt, endDate),
          ));

        const clickResult = await db.select({ clicks: count() })
          .from(analyticsEvents)
          .where(and(
            eq(analyticsEvents.eventType, 'click'),
            eq(analyticsEvents.page, page),
            gte(analyticsEvents.createdAt, startDate),
            lte(analyticsEvents.createdAt, endDate),
          ));

        const scrollResult = await db.select({ avgScroll: avg(analyticsEvents.value) })
          .from(analyticsEvents)
          .where(and(
            eq(analyticsEvents.eventType, 'scroll'),
            eq(analyticsEvents.page, page),
            gte(analyticsEvents.createdAt, startDate),
            lte(analyticsEvents.createdAt, endDate),
          ));

        const timeResult = await db.select({ avgTime: avg(analyticsEvents.value) })
          .from(analyticsEvents)
          .where(and(
            eq(analyticsEvents.eventType, 'time_spent'),
            eq(analyticsEvents.page, page),
            gte(analyticsEvents.createdAt, startDate),
            lte(analyticsEvents.createdAt, endDate),
          ));

        const topElResult = await db.select({
          elementId: analyticsEvents.elementId,
          elementText: analyticsEvents.elementText,
          clickCount: count(),
        }).from(analyticsEvents)
          .where(and(
            eq(analyticsEvents.eventType, 'click'),
            eq(analyticsEvents.page, page),
            gte(analyticsEvents.createdAt, startDate),
            lte(analyticsEvents.createdAt, endDate),
          ))
          .groupBy(analyticsEvents.elementId, analyticsEvents.elementText)
          .orderBy(desc(count()))
          .limit(10);

        await db.insert(analyticsDailySummary).values({
          date: dateStr,
          page,
          uniqueUsers: pvResult[0]?.uniqueUsers || 0,
          totalPageViews: pvResult[0]?.views || 0,
          totalClicks: clickResult[0]?.clicks || 0,
          avgScrollDepth: Math.round(Number(scrollResult[0]?.avgScroll) || 0),
          avgTimeSpent: Math.round(Number(timeResult[0]?.avgTime) || 0),
          topElements: topElResult.map(e => ({ elementId: e.elementId, elementText: e.elementText, count: e.clickCount })),
        }).onConflictDoUpdate({
          target: [analyticsDailySummary.date, analyticsDailySummary.page],
          set: {
            uniqueUsers: sql`excluded.unique_users`,
            totalPageViews: sql`excluded.total_page_views`,
            totalClicks: sql`excluded.total_clicks`,
            avgScrollDepth: sql`excluded.avg_scroll_depth`,
            avgTimeSpent: sql`excluded.avg_time_spent`,
            topElements: sql`excluded.top_elements`,
          },
        });
      }
    }

    async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
      const [result] = await db.insert(quizzes).values(quiz).returning();
      return result;
    }

    async updateQuiz(id: number, updates: Partial<InsertQuiz>): Promise<Quiz | undefined> {
      const [result] = await db.update(quizzes).set({ ...updates, updatedAt: new Date() }).where(eq(quizzes.id, id)).returning();
      return result;
    }

    async deleteQuiz(id: number): Promise<void> {
      await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
      await db.delete(quizAttempts).where(eq(quizAttempts.quizId, id));
      await db.delete(quizzes).where(eq(quizzes.id, id));
    }

    async getQuizById(id: number): Promise<Quiz | undefined> {
      const [result] = await db.select().from(quizzes).where(eq(quizzes.id, id));
      return result;
    }

    async getQuizByDate(dateStr: string): Promise<Quiz | undefined> {
      const [result] = await db.select().from(quizzes).where(and(eq(quizzes.publishDate, dateStr), eq(quizzes.isActive, true)));
      return result;
    }

    async listQuizzes(): Promise<Quiz[]> {
      return db.select().from(quizzes).orderBy(desc(quizzes.publishDate));
    }

    async createQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
      const [result] = await db.insert(quizQuestions).values(question).returning();
      return result;
    }

    async updateQuestion(id: number, updates: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined> {
      const [result] = await db.update(quizQuestions).set(updates).where(eq(quizQuestions.id, id)).returning();
      return result;
    }

    async deleteQuestion(id: number): Promise<void> {
      await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
    }

    async getQuestionsByQuizId(quizId: number): Promise<QuizQuestion[]> {
      return db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(asc(quizQuestions.sortOrder));
    }

    async deleteQuestionsByQuizId(quizId: number): Promise<void> {
      await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    }

    async saveAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
      const [result] = await db.insert(quizAttempts).values(attempt).returning();
      return result;
    }

    async getAttemptByUserAndQuiz(odUserId: string, quizId: number): Promise<QuizAttempt | undefined> {
      const [result] = await db.select().from(quizAttempts).where(and(eq(quizAttempts.odUserId, odUserId), eq(quizAttempts.quizId, quizId)));
      return result;
    }

    async getUserAttemptHistory(odUserId: string, limitNum: number = 50): Promise<{ id: number; odUserId: string; quizId: number; score: number; totalQuestions: number; answers: Record<string, number[]>; completedAt: Date; quizTitle: string; quizPublishDate: string }[]> {
      const results = await db.select({
        id: quizAttempts.id,
        odUserId: quizAttempts.odUserId,
        quizId: quizAttempts.quizId,
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
        answers: quizAttempts.answers,
        completedAt: quizAttempts.completedAt,
        quizTitle: quizzes.title,
        quizPublishDate: quizzes.publishDate,
      }).from(quizAttempts)
        .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .where(eq(quizAttempts.odUserId, odUserId))
        .orderBy(desc(quizAttempts.completedAt))
        .limit(limitNum);
      return results;
    }

    async getUserBadges(odUserId: string): Promise<UserBadge[]> {
      return db.select().from(userBadges).where(eq(userBadges.odUserId, odUserId)).orderBy(asc(userBadges.earnedAt));
    }

    async awardBadge(odUserId: string, badgeId: string): Promise<UserBadge | null> {
      try {
        const [result] = await db.insert(userBadges).values({ odUserId, badgeId }).returning();
        return result;
      } catch (err: any) {
        if (err?.code === "23505") return null;
        throw err;
      }
    }

    async getUserAttemptDates(odUserId: string): Promise<string[]> {
      const results = await db.select({
        dateStr: sql<string>`DATE(${quizAttempts.completedAt} AT TIME ZONE 'Asia/Kolkata')::text`,
      }).from(quizAttempts)
        .where(eq(quizAttempts.odUserId, odUserId))
        .orderBy(desc(quizAttempts.completedAt));
      return results.map(r => r.dateStr);
    }

    async hasUserPerfectScore(odUserId: string): Promise<boolean> {
      const [result] = await db.select({ cnt: count() }).from(quizAttempts)
        .where(and(
          eq(quizAttempts.odUserId, odUserId),
          sql`${quizAttempts.score} = ${quizAttempts.totalQuestions}`
        ));
      return (result?.cnt ?? 0) > 0;
    }

    async getUserAttemptCount(odUserId: string): Promise<number> {
      const [result] = await db.select({ cnt: count() }).from(quizAttempts)
        .where(eq(quizAttempts.odUserId, odUserId));
      return result?.cnt ?? 0;
    }

    async getQuizAnalyticsSummary() {
      const [result] = await db.select({
        totalAttempts: count(),
        uniqueUsers: countDistinct(quizAttempts.odUserId),
        avgScore: avg(sql`ROUND(${quizAttempts.score}::numeric / NULLIF(${quizAttempts.totalQuestions}, 0) * 100, 1)`),
      }).from(quizAttempts);

      const [perfectResult] = await db.select({ cnt: count() }).from(quizAttempts)
        .where(sql`${quizAttempts.score} = ${quizAttempts.totalQuestions}`);

      return {
        totalAttempts: result?.totalAttempts ?? 0,
        uniqueUsers: result?.uniqueUsers ?? 0,
        avgScore: Math.round(Number(result?.avgScore) || 0),
        perfectScores: perfectResult?.cnt ?? 0,
      };
    }

    async getQuizAnalyticsPerQuiz() {
      const results = await db.select({
        quizId: quizzes.id,
        title: quizzes.title,
        publishDate: quizzes.publishDate,
        attempts: count(quizAttempts.id),
        avgScore: avg(sql`ROUND(${quizAttempts.score}::numeric / NULLIF(${quizAttempts.totalQuestions}, 0) * 100, 1)`),
        perfectScores: sql<number>`SUM(CASE WHEN ${quizAttempts.score} = ${quizAttempts.totalQuestions} THEN 1 ELSE 0 END)::int`,
      }).from(quizzes)
        .leftJoin(quizAttempts, eq(quizzes.id, quizAttempts.quizId))
        .groupBy(quizzes.id, quizzes.title, quizzes.publishDate)
        .orderBy(desc(quizzes.publishDate));

      return results.map(r => ({
        quizId: r.quizId,
        title: r.title,
        publishDate: r.publishDate,
        attempts: r.attempts ?? 0,
        avgScore: Math.round(Number(r.avgScore) || 0),
        perfectScores: r.perfectScores ?? 0,
      }));
    }

    async getQuizAnalyticsAttempts(page: number, limitNum: number) {
      const offset = (page - 1) * limitNum;

      const [totalResult] = await db.select({ cnt: count() }).from(quizAttempts);
      const total = totalResult?.cnt ?? 0;

      const attempts = await db.select({
        id: quizAttempts.id,
        odUserId: quizAttempts.odUserId,
        quizTitle: quizzes.title,
        quizPublishDate: quizzes.publishDate,
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
        completedAt: quizAttempts.completedAt,
      }).from(quizAttempts)
        .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .orderBy(desc(quizAttempts.completedAt))
        .limit(limitNum)
        .offset(offset);

      return { attempts, total };
    }

    async getAppSetting(key: string): Promise<string | null> {
      const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
      return row?.value ?? null;
    }

    async setAppSetting(key: string, value: string): Promise<void> {
      await db.insert(appSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
    }

    async tryCronClaim(key: string, windowMinutes: number): Promise<boolean> {
      const now = new Date();
      const epoch = new Date(0);
      const threshold = new Date(now.getTime() - windowMinutes * 60 * 1000);

      // Step 1: Seed the row with an epoch timestamp if it doesn't exist yet.
      // ON CONFLICT DO NOTHING means exactly one process creates it; others skip.
      await db.execute(sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (${key}, '1970-01-01T00:00:00.000Z', ${epoch})
        ON CONFLICT (key) DO NOTHING
      `);

      // Step 2: Conditional UPDATE — PostgreSQL row-lock guarantees that concurrent
      // UPDATE statements on the same row are serialized. The first one to commit
      // sets updated_at = now; any later process sees updated_at >= threshold and
      // gets 0 rows, so only one winner per window.
      const result = await db.execute(sql`
        UPDATE app_settings
        SET value      = ${now.toISOString()},
            updated_at = ${now}
        WHERE key          = ${key}
          AND updated_at   < ${threshold}
        RETURNING key
      `);
      return (result.rows?.length ?? 0) > 0;
    }

    async deleteUserData(odUserId: string): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.delete(quizAttempts).where(eq(quizAttempts.odUserId, odUserId));
        await tx.delete(userBadges).where(eq(userBadges.odUserId, odUserId));
        await tx.delete(analyticsEvents).where(eq(analyticsEvents.userId, odUserId));
        await tx.delete(supportMessages).where(eq(supportMessages.odUserId, odUserId));
      });
    }

    async createSupportMessage(msg: InsertSupportMessage): Promise<SupportMessage> {
      const [result] = await db.insert(supportMessages).values(msg).returning();
      return result;
    }

    async listUserSupportMessages(odUserId: string, type: string): Promise<SupportMessage[]> {
      return db.select().from(supportMessages)
        .where(and(eq(supportMessages.odUserId, odUserId), eq(supportMessages.type, type)))
        .orderBy(desc(supportMessages.createdAt));
    }

    async listAllSupportMessages(type?: string, status?: string): Promise<SupportMessage[]> {
      const conditions = [];
      if (type) conditions.push(eq(supportMessages.type, type));
      if (status) conditions.push(eq(supportMessages.status, status));
      return db.select().from(supportMessages)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(supportMessages.createdAt));
    }

    async getSupportMessage(id: number): Promise<SupportMessage | undefined> {
      const [result] = await db.select().from(supportMessages).where(eq(supportMessages.id, id));
      return result;
    }

    async replySupportMessage(id: number, reply: string): Promise<SupportMessage> {
      const [result] = await db.update(supportMessages)
        .set({ adminReply: reply, status: "replied", repliedAt: new Date() })
        .where(eq(supportMessages.id, id))
        .returning();
      return result;
    }

    async createChatConversation(data: InsertChatConversation): Promise<ChatConversation> {
      const [result] = await db.insert(chatConversations).values(data).returning();
      return result;
    }

    async getChatConversation(id: number): Promise<ChatConversation | undefined> {
      const [result] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
      return result;
    }

    async getActiveChatConversationForVisitor(visitorId: string): Promise<ChatConversation | undefined> {
      const [result] = await db.select().from(chatConversations)
        .where(and(eq(chatConversations.visitorId, visitorId), sql`${chatConversations.status} <> 'closed'`))
        .orderBy(desc(chatConversations.lastMessageAt))
        .limit(1);
      return result;
    }

    async listChatConversations(status?: string, limitNum = 100): Promise<ChatConversation[]> {
      return db.select().from(chatConversations)
        .where(status ? eq(chatConversations.status, status as any) : undefined)
        .orderBy(desc(chatConversations.lastMessageAt))
        .limit(limitNum);
    }

    async updateChatConversation(id: number, patch: Partial<InsertChatConversation>): Promise<ChatConversation | undefined> {
      const [result] = await db.update(chatConversations).set(patch)
        .where(eq(chatConversations.id, id))
        .returning();
      return result;
    }

    async appendChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
      const [result] = await db.insert(chatMessages).values(msg).returning();
      await db.update(chatConversations)
        .set({ lastMessageAt: result.createdAt })
        .where(eq(chatConversations.id, msg.conversationId));
      return result;
    }

    async listChatMessages(conversationId: number, sinceId = 0): Promise<ChatMessage[]> {
      return db.select().from(chatMessages)
        .where(and(eq(chatMessages.conversationId, conversationId), sql`${chatMessages.id} > ${sinceId}`))
        .orderBy(asc(chatMessages.id));
    }

    async bumpChatUnread(id: number, side: "agent" | "visitor", by = 1): Promise<void> {
      const column = side === "agent" ? chatConversations.unreadForAgent : chatConversations.unreadForVisitor;
      await db.update(chatConversations)
        .set({ [side === "agent" ? "unreadForAgent" : "unreadForVisitor"]: sql`${column} + ${by}` })
        .where(eq(chatConversations.id, id));
    }

    async clearChatUnread(id: number, side: "agent" | "visitor"): Promise<void> {
      await db.update(chatConversations)
        .set(side === "agent" ? { unreadForAgent: 0 } : { unreadForVisitor: 0 })
        .where(eq(chatConversations.id, id));
    }

    async insertReconciliationLog(log: InsertReconciliationLog): Promise<ReconciliationLog> {
      const [result] = await db.insert(reconciliationLogs).values({
        ranAt: log.ranAt ?? new Date(),
        checkedCount: log.checkedCount ?? 0,
        ackedCount: log.ackedCount ?? 0,
        failedCount: log.failedCount ?? 0,
        pendingCount: log.pendingCount ?? 0,
        errorCount: log.errorCount ?? 0,
        details: log.details ?? [],
      }).returning();
      return result;
    }

    async getReconciliationLogs(from: Date, to: Date): Promise<ReconciliationLog[]> {
      return db.select().from(reconciliationLogs)
        .where(and(gte(reconciliationLogs.ranAt, from), lte(reconciliationLogs.ranAt, to)))
        .orderBy(desc(reconciliationLogs.ranAt));
    }

    async createPasswordResetToken(token: string, uid: string, email: string, expiresAt: Date): Promise<void> {
      await db.insert(passwordResetTokens).values({ token, uid, email, expiresAt });
    }

    async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
      const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return row;
    }

    async deletePasswordResetToken(token: string): Promise<void> {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    }

    async deleteExpiredPasswordResetTokens(): Promise<void> {
      await db.delete(passwordResetTokens).where(sql`${passwordResetTokens.expiresAt} < now()`);
    }

    async getAdminRolesForUser(firebaseUid: string): Promise<string[]> {
      const rows = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.firebaseUid, firebaseUid));
      return rows.map(r => r.role);
    }

    async listAllAdminRoles(): Promise<AdminRole[]> {
      return db.select().from(adminRoles).orderBy(desc(adminRoles.createdAt));
    }

    async grantAdminRole(firebaseUid: string, email: string, role: string, grantedByUid: string): Promise<AdminRole> {
      const [result] = await db.insert(adminRoles).values({ firebaseUid, email, role, grantedByUid }).onConflictDoUpdate({
        target: [adminRoles.firebaseUid, adminRoles.role],
        set: { email, grantedByUid },
      }).returning();
      return result;
    }

    async revokeAdminRole(id: number): Promise<void> {
      await db.delete(adminRoles).where(eq(adminRoles.id, id));
    }

    // ----- Daily practice content -----

    async getDailyQuestion(dateStr: string): Promise<DailyQuestion | undefined> {
      const [row] = await db.select().from(dailyQuestions)
        .where(and(eq(dailyQuestions.contentDate, dateStr), eq(dailyQuestions.isActive, true)));
      return row;
    }

    async getDailyActivity(dateStr: string): Promise<DailyActivity | undefined> {
      const [row] = await db.select().from(dailyActivities)
        .where(and(eq(dailyActivities.contentDate, dateStr), eq(dailyActivities.isActive, true)));
      return row;
    }

    async upsertDailyQuestion(data: InsertDailyQuestion): Promise<DailyQuestion> {
      const [row] = await db.insert(dailyQuestions).values(data).onConflictDoUpdate({
        target: dailyQuestions.contentDate,
        set: {
          questionText: data.questionText,
          options: data.options,
          correctIndex: data.correctIndex,
          points: data.points ?? 1,
          explanation: data.explanation ?? null,
          isActive: data.isActive ?? true,
          updatedAt: new Date(),
        },
      }).returning();
      return row;
    }

    async upsertDailyActivity(data: InsertDailyActivity): Promise<DailyActivity> {
      const [row] = await db.insert(dailyActivities).values(data).onConflictDoUpdate({
        target: dailyActivities.contentDate,
        set: {
          activityType: data.activityType ?? "anagram",
          answerMode: data.answerMode ?? "text",
          instructions: data.instructions ?? null,
          prompt: data.prompt,
          imageUrl: data.imageUrl ?? null,
          options: data.options ?? null,
          correctIndex: data.correctIndex ?? null,
          correctAnswer: data.correctAnswer ?? null,
          points: data.points ?? 2,
          explanation: data.explanation ?? null,
          isActive: data.isActive ?? true,
          updatedAt: new Date(),
        },
      }).returning();
      return row;
    }

    async deleteDailyQuestion(dateStr: string): Promise<void> {
      await db.delete(dailyQuestions).where(eq(dailyQuestions.contentDate, dateStr));
    }

    async deleteDailyActivity(dateStr: string): Promise<void> {
      await db.delete(dailyActivities).where(eq(dailyActivities.contentDate, dateStr));
    }

    async listDailyContentDates(limitNum: number = 60): Promise<DailyContentDateRow[]> {
      const rows = await db.execute(sql`
        SELECT d.content_date::text AS content_date,
               bool_or(d.kind = 'q') AS has_question,
               bool_or(d.kind = 'a') AS has_activity
        FROM (
          SELECT content_date, 'q' AS kind FROM daily_questions
          UNION ALL SELECT content_date, 'a' FROM daily_activities
        ) d
        GROUP BY d.content_date
        ORDER BY d.content_date DESC
        LIMIT ${limitNum}
      `);
      return (rows.rows as any[]).map(r => ({
        contentDate: r.content_date,
        hasQuestion: !!r.has_question,
        hasActivity: !!r.has_activity,
      }));
    }

    // ----- Devotee submissions -----

    async getDailyReflection(odUserId: string, dateStr: string): Promise<DailyReflection | undefined> {
      const [row] = await db.select().from(dailyReflections)
        .where(and(eq(dailyReflections.odUserId, odUserId), eq(dailyReflections.contentDate, dateStr)));
      return row;
    }

    async getDailyQuestionResponse(odUserId: string, dateStr: string): Promise<DailyQuestionResponse | undefined> {
      const [row] = await db.select().from(dailyQuestionResponses)
        .where(and(eq(dailyQuestionResponses.odUserId, odUserId), eq(dailyQuestionResponses.contentDate, dateStr)));
      return row;
    }

    async getDailyActivityResponse(odUserId: string, dateStr: string): Promise<DailyActivityResponse | undefined> {
      const [row] = await db.select().from(dailyActivityResponses)
        .where(and(eq(dailyActivityResponses.odUserId, odUserId), eq(dailyActivityResponses.contentDate, dateStr)));
      return row;
    }

    // The lock taken here is the same one the submission path takes, so a
    // devotee cannot slip an answer in between the check and the write: whoever
    // gets the row lock first wins, and the loser sees the other's outcome.
    async saveDailyQuestionIfUnanswered(data: InsertDailyQuestion): Promise<DailyContentSaveResult> {
      return db.transaction(async (tx) => {
        const existing = await tx.select().from(dailyQuestions)
          .where(eq(dailyQuestions.contentDate, data.contentDate)).for("update");
        if (existing.length > 0) {
          const answered = await tx.select({ id: dailyQuestionResponses.id }).from(dailyQuestionResponses)
            .where(eq(dailyQuestionResponses.contentDate, data.contentDate)).limit(1);
          if (answered.length > 0) return "frozen";
        }
        await tx.insert(dailyQuestions).values(data).onConflictDoUpdate({
          target: dailyQuestions.contentDate,
          set: {
            questionText: data.questionText,
            options: data.options,
            correctIndex: data.correctIndex,
            points: data.points ?? 1,
            explanation: data.explanation ?? null,
            isActive: data.isActive ?? true,
            updatedAt: new Date(),
          },
        });
        return "saved";
      });
    }

    async saveDailyActivityIfUnanswered(data: InsertDailyActivity): Promise<DailyContentSaveResult> {
      return db.transaction(async (tx) => {
        const existing = await tx.select().from(dailyActivities)
          .where(eq(dailyActivities.contentDate, data.contentDate)).for("update");
        if (existing.length > 0) {
          const answered = await tx.select({ id: dailyActivityResponses.id }).from(dailyActivityResponses)
            .where(eq(dailyActivityResponses.contentDate, data.contentDate)).limit(1);
          if (answered.length > 0) return "frozen";
        }
        await tx.insert(dailyActivities).values(data).onConflictDoUpdate({
          target: dailyActivities.contentDate,
          set: {
            activityType: data.activityType ?? "anagram",
            answerMode: data.answerMode ?? "text",
            instructions: data.instructions ?? null,
            prompt: data.prompt,
            imageUrl: data.imageUrl ?? null,
            options: data.options ?? null,
            correctIndex: data.correctIndex ?? null,
            correctAnswer: data.correctAnswer ?? null,
            points: data.points ?? 2,
            explanation: data.explanation ?? null,
            isActive: data.isActive ?? true,
            updatedAt: new Date(),
          },
        });
        return "saved";
      });
    }

    async deleteDailyQuestionIfUnanswered(dateStr: string): Promise<DailyContentSaveResult> {
      return db.transaction(async (tx) => {
        const existing = await tx.select().from(dailyQuestions)
          .where(eq(dailyQuestions.contentDate, dateStr)).for("update");
        if (existing.length === 0) return "saved";
        const answered = await tx.select({ id: dailyQuestionResponses.id }).from(dailyQuestionResponses)
          .where(eq(dailyQuestionResponses.contentDate, dateStr)).limit(1);
        if (answered.length > 0) return "frozen";
        await tx.delete(dailyQuestions).where(eq(dailyQuestions.contentDate, dateStr));
        return "saved";
      });
    }

    async deleteDailyActivityIfUnanswered(dateStr: string): Promise<DailyContentSaveResult> {
      return db.transaction(async (tx) => {
        const existing = await tx.select().from(dailyActivities)
          .where(eq(dailyActivities.contentDate, dateStr)).for("update");
        if (existing.length === 0) return "saved";
        const answered = await tx.select({ id: dailyActivityResponses.id }).from(dailyActivityResponses)
          .where(eq(dailyActivityResponses.contentDate, dateStr)).limit(1);
        if (answered.length > 0) return "frozen";
        await tx.delete(dailyActivities).where(eq(dailyActivities.contentDate, dateStr));
        return "saved";
      });
    }

    async countDailyQuestionResponses(dateStr: string): Promise<number> {
      const rows = await db.select({ id: dailyQuestionResponses.id }).from(dailyQuestionResponses)
        .where(eq(dailyQuestionResponses.contentDate, dateStr));
      return rows.length;
    }

    async countDailyActivityResponses(dateStr: string): Promise<number> {
      const rows = await db.select({ id: dailyActivityResponses.id }).from(dailyActivityResponses)
        .where(eq(dailyActivityResponses.contentDate, dateStr));
      return rows.length;
    }

    async submitDailyReflection(odUserId: string, dateStr: string, guruvaniId: number | null, reflectionText: string, points: number): Promise<DailyReflection | null> {
      return db.transaction(async (tx) => {
        const inserted = await tx.insert(dailyReflections).values({
          odUserId, contentDate: dateStr, guruvaniId, reflectionText, pointsAwarded: points,
        }).onConflictDoNothing().returning();
        if (inserted.length === 0) return null;
        if (points > 0) {
          await tx.insert(dharmaPoints).values({
            odUserId, sourceType: DHARMA_SOURCE_GURUVANI, sourceDate: dateStr, sourceId: guruvaniId, points,
          }).onConflictDoNothing();
        }
        return inserted[0];
      });
    }

    // Everything that decides the outcome — reading the scheduled item, checking
    // the option, grading it, recording the response and awarding the points —
    // happens inside one transaction, after the row lock. An admin editing the
    // item waits on the same lock, so an answer can never be graded against a
    // revision other than the one that is saved.
    async gradeDailyQuestion(odUserId: string, dateStr: string, selectedIndex: number): Promise<DailyGradeResult<DailyQuestionResponse, DailyQuestion>> {
      return db.transaction(async (tx) => {
        const [question] = await tx.select().from(dailyQuestions)
          .where(eq(dailyQuestions.contentDate, dateStr)).for("update");
        if (!question || !question.isActive) return { status: "missing" };
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.options.length) {
          return { status: "invalid" };
        }

        const isCorrect = selectedIndex === question.correctIndex;
        const points = isCorrect ? question.points : 0;

        const inserted = await tx.insert(dailyQuestionResponses).values({
          odUserId, contentDate: dateStr, questionId: question.id, selectedIndex, isCorrect, pointsAwarded: points,
        }).onConflictDoNothing().returning();
        if (inserted.length === 0) return { status: "duplicate" };

        if (points > 0) {
          await tx.insert(dharmaPoints).values({
            odUserId, sourceType: DHARMA_SOURCE_QUESTION, sourceDate: dateStr, sourceId: question.id, points,
          }).onConflictDoNothing();
        }
        return { status: "graded", response: inserted[0], content: question };
      });
    }

    async gradeDailyActivity(odUserId: string, dateStr: string, input: DailyAnswerInput): Promise<DailyGradeResult<DailyActivityResponse, DailyActivity>> {
      return db.transaction(async (tx) => {
        const [activity] = await tx.select().from(dailyActivities)
          .where(eq(dailyActivities.contentDate, dateStr)).for("update");
        if (!activity || !activity.isActive) return { status: "missing" };

        let isCorrect = false;
        let submittedAnswer = "";

        if (activity.answerMode === "options") {
          const options = activity.options ?? [];
          const selectedIndex = input.selectedIndex;
          if (typeof selectedIndex !== "number" || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) {
            return { status: "invalid" };
          }
          submittedAnswer = options[selectedIndex];
          isCorrect = selectedIndex === activity.correctIndex;
        } else {
          const answer = typeof input.answer === "string" ? input.answer.trim() : "";
          // Mirrors the client's input restriction server-side so a direct API
          // call cannot submit anything the UI would have blocked while typing.
          if (!answer || answer.length > 500 || !/^[A-Za-z ]+$/.test(answer)) return { status: "invalid" };
          submittedAnswer = answer;
          const normalize = activity.activityType === "anagram" ? normalizeAnagramAnswer : normalizeDailyAnswer;
          isCorrect = !!activity.correctAnswer && normalize(answer) === normalize(activity.correctAnswer);
        }

        const points = isCorrect ? activity.points : 0;

        const inserted = await tx.insert(dailyActivityResponses).values({
          odUserId, contentDate: dateStr, activityId: activity.id, submittedAnswer, isCorrect, pointsAwarded: points,
        }).onConflictDoNothing().returning();
        if (inserted.length === 0) return { status: "duplicate" };

        if (points > 0) {
          await tx.insert(dharmaPoints).values({
            odUserId, sourceType: DHARMA_SOURCE_ACTIVITY, sourceDate: dateStr, sourceId: activity.id, points,
          }).onConflictDoNothing();
        }
        return { status: "graded", response: inserted[0], content: activity };
      });
    }

    // ----- Dharma Points ledger -----

    async getDharmaPointsSummary(odUserId: string, dateStr: string): Promise<{ total: number; today: number }> {
      const [row] = await db.select({
        total: sql<string>`COALESCE(SUM(${dharmaPoints.points}), 0)`,
        today: sql<string>`COALESCE(SUM(CASE WHEN ${dharmaPoints.sourceDate} = ${dateStr} THEN ${dharmaPoints.points} ELSE 0 END), 0)`,
      }).from(dharmaPoints).where(eq(dharmaPoints.odUserId, odUserId));
      return { total: Number(row?.total ?? 0), today: Number(row?.today ?? 0) };
    }

    async listDharmaAwards(odUserId: string, limitNum: number = 50): Promise<DharmaPointsEntry[]> {
      return db.select().from(dharmaPoints)
        .where(eq(dharmaPoints.odUserId, odUserId))
        .orderBy(desc(dharmaPoints.sourceDate))
        .limit(limitNum);
    }

    async listDailyHistory(odUserId: string, limitNum: number = 30): Promise<DailyHistory> {
      const [reflections, questions, activities] = await Promise.all([
        db.select({
          id: dailyReflections.id,
          odUserId: dailyReflections.odUserId,
          contentDate: dailyReflections.contentDate,
          guruvaniId: dailyReflections.guruvaniId,
          reflectionText: dailyReflections.reflectionText,
          pointsAwarded: dailyReflections.pointsAwarded,
          createdAt: dailyReflections.createdAt,
          quote: dailyGuruvani.quote,
        }).from(dailyReflections)
          .leftJoin(dailyGuruvani, eq(dailyReflections.guruvaniId, dailyGuruvani.id))
          .where(eq(dailyReflections.odUserId, odUserId))
          .orderBy(desc(dailyReflections.contentDate)).limit(limitNum)
          .then(rows => rows.map(r => ({ ...r, quote: r.quote ?? getGuruvaniForDate(r.contentDate) }))),
        db.select({
          id: dailyQuestionResponses.id,
          odUserId: dailyQuestionResponses.odUserId,
          contentDate: dailyQuestionResponses.contentDate,
          questionId: dailyQuestionResponses.questionId,
          selectedIndex: dailyQuestionResponses.selectedIndex,
          isCorrect: dailyQuestionResponses.isCorrect,
          pointsAwarded: dailyQuestionResponses.pointsAwarded,
          createdAt: dailyQuestionResponses.createdAt,
          questionText: dailyQuestions.questionText,
          options: dailyQuestions.options,
          correctIndex: dailyQuestions.correctIndex,
        }).from(dailyQuestionResponses)
          .innerJoin(dailyQuestions, eq(dailyQuestionResponses.questionId, dailyQuestions.id))
          .where(eq(dailyQuestionResponses.odUserId, odUserId))
          .orderBy(desc(dailyQuestionResponses.contentDate)).limit(limitNum),
        db.select({
          id: dailyActivityResponses.id,
          odUserId: dailyActivityResponses.odUserId,
          contentDate: dailyActivityResponses.contentDate,
          activityId: dailyActivityResponses.activityId,
          submittedAnswer: dailyActivityResponses.submittedAnswer,
          isCorrect: dailyActivityResponses.isCorrect,
          pointsAwarded: dailyActivityResponses.pointsAwarded,
          createdAt: dailyActivityResponses.createdAt,
          prompt: dailyActivities.prompt,
          correctAnswer: dailyActivities.correctAnswer,
        }).from(dailyActivityResponses)
          .innerJoin(dailyActivities, eq(dailyActivityResponses.activityId, dailyActivities.id))
          .where(eq(dailyActivityResponses.odUserId, odUserId))
          .orderBy(desc(dailyActivityResponses.contentDate)).limit(limitNum),
      ]);
      return { reflections, questions, activities } as DailyHistory;
    }

    async listDailySubmissionsForDate(dateStr: string): Promise<DailyHistory> {
      const [reflections, questions, activities] = await Promise.all([
        db.select({
          id: dailyReflections.id,
          odUserId: dailyReflections.odUserId,
          contentDate: dailyReflections.contentDate,
          guruvaniId: dailyReflections.guruvaniId,
          reflectionText: dailyReflections.reflectionText,
          pointsAwarded: dailyReflections.pointsAwarded,
          createdAt: dailyReflections.createdAt,
          quote: dailyGuruvani.quote,
        }).from(dailyReflections)
          .leftJoin(dailyGuruvani, eq(dailyReflections.guruvaniId, dailyGuruvani.id))
          .where(eq(dailyReflections.contentDate, dateStr))
          .orderBy(desc(dailyReflections.createdAt)).limit(500)
          .then(rows => rows.map(r => ({ ...r, quote: r.quote ?? getGuruvaniForDate(r.contentDate) }))),
        db.select({
          id: dailyQuestionResponses.id,
          odUserId: dailyQuestionResponses.odUserId,
          contentDate: dailyQuestionResponses.contentDate,
          questionId: dailyQuestionResponses.questionId,
          selectedIndex: dailyQuestionResponses.selectedIndex,
          isCorrect: dailyQuestionResponses.isCorrect,
          pointsAwarded: dailyQuestionResponses.pointsAwarded,
          createdAt: dailyQuestionResponses.createdAt,
          questionText: dailyQuestions.questionText,
          options: dailyQuestions.options,
          correctIndex: dailyQuestions.correctIndex,
        }).from(dailyQuestionResponses)
          .innerJoin(dailyQuestions, eq(dailyQuestionResponses.questionId, dailyQuestions.id))
          .where(eq(dailyQuestionResponses.contentDate, dateStr))
          .orderBy(desc(dailyQuestionResponses.createdAt)).limit(500),
        db.select({
          id: dailyActivityResponses.id,
          odUserId: dailyActivityResponses.odUserId,
          contentDate: dailyActivityResponses.contentDate,
          activityId: dailyActivityResponses.activityId,
          submittedAnswer: dailyActivityResponses.submittedAnswer,
          isCorrect: dailyActivityResponses.isCorrect,
          pointsAwarded: dailyActivityResponses.pointsAwarded,
          createdAt: dailyActivityResponses.createdAt,
          prompt: dailyActivities.prompt,
          correctAnswer: dailyActivities.correctAnswer,
        }).from(dailyActivityResponses)
          .innerJoin(dailyActivities, eq(dailyActivityResponses.activityId, dailyActivities.id))
          .where(eq(dailyActivityResponses.contentDate, dateStr))
          .orderBy(desc(dailyActivityResponses.createdAt)).limit(500),
      ]);
      return { reflections, questions, activities } as DailyHistory;
    }

    async getDailyPracticeCompletionDates(odUserId: string): Promise<string[]> {
      const rows = await db.select({ contentDate: dailyReflections.contentDate })
        .from(dailyReflections)
        .innerJoin(dailyQuestionResponses, and(
          eq(dailyQuestionResponses.odUserId, dailyReflections.odUserId),
          eq(dailyQuestionResponses.contentDate, dailyReflections.contentDate),
        ))
        .innerJoin(dailyActivityResponses, and(
          eq(dailyActivityResponses.odUserId, dailyReflections.odUserId),
          eq(dailyActivityResponses.contentDate, dailyReflections.contentDate),
        ))
        .where(eq(dailyReflections.odUserId, odUserId));
      return rows.map(r => r.contentDate);
    }
  }

  storage = new PgStorage();
  console.log("Using PostgreSQL storage for analytics");
} else {
  storage = new MemStorage();
  console.log("Using in-memory storage (no DATABASE_URL)");
}

export { storage };
