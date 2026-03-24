import { type User, type InsertUser, type InsertAnalyticsEvent, analyticsEvents, analyticsDailySummary, quizzes, quizQuestions, quizAttempts, userBadges, appSettings, supportMessages, type InsertQuiz, type Quiz, type InsertQuizQuestion, type QuizQuestion, type InsertQuizAttempt, type QuizAttempt, type UserBadge, type InsertSupportMessage, type SupportMessage } from "@shared/schema";
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
  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;
  deleteUserData(odUserId: string): Promise<void>;
  createSupportMessage(msg: InsertSupportMessage): Promise<SupportMessage>;
  listUserSupportMessages(odUserId: string, type: string): Promise<SupportMessage[]>;
  getSupportMessage(id: number): Promise<SupportMessage | undefined>;
  replySupportMessage(id: number, reply: string): Promise<SupportMessage>;
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
  async getAppSetting(_key: string): Promise<string | null> { return null; }
  async setAppSetting(_key: string, _value: string): Promise<void> {}
  async deleteUserData(_odUserId: string): Promise<void> {}
  async createSupportMessage(_msg: InsertSupportMessage): Promise<SupportMessage> { throw new Error("Not implemented"); }
  async listUserSupportMessages(_odUserId: string, _type: string): Promise<SupportMessage[]> { return []; }
  async getSupportMessage(_id: number): Promise<SupportMessage | undefined> { return undefined; }
  async replySupportMessage(_id: number, _reply: string): Promise<SupportMessage> { throw new Error("Not implemented"); }
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

    async getAppSetting(key: string): Promise<string | null> {
      const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
      return row?.value ?? null;
    }

    async setAppSetting(key: string, value: string): Promise<void> {
      await db.insert(appSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
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
  }

  storage = new PgStorage();
  console.log("Using PostgreSQL storage for analytics");
} else {
  storage = new MemStorage();
  console.log("Using in-memory storage (no DATABASE_URL)");
}

export { storage };
