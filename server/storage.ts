import { type User, type InsertUser, type InsertAnalyticsEvent, analyticsEvents, analyticsDailySummary } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, and, gte, lte, desc, count, countDistinct, avg } from "drizzle-orm";
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
  }

  storage = new PgStorage();
  console.log("Using PostgreSQL storage for analytics");
} else {
  storage = new MemStorage();
  console.log("Using in-memory storage (no DATABASE_URL)");
}

export { storage };
