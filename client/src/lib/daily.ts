export interface DharmaSummary {
  total: number;
  today: number;
}

export interface DailyGuruvaniItem {
  id: number | null;
  quote: string;
  attribution: string;
  points: number;
  reflected: boolean;
  reflectionText: string | null;
  pointsAwarded: number | null;
}

export interface DailyQuestionItem {
  id: number;
  questionText: string;
  options: string[];
  points: number;
  answered: boolean;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  correctIndex?: number;
  explanation?: string | null;
}

export interface DailyActivityItem {
  id: number;
  activityType: string;
  answerMode: "text" | "options";
  instructions: string | null;
  prompt: string;
  imageUrl: string | null;
  options: string[] | null;
  points: number;
  answered: boolean;
  submittedAnswer: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  correctAnswer?: string | null;
  correctIndex?: number | null;
  explanation?: string | null;
}

export interface DailyToday {
  date: string;
  guruvani: DailyGuruvaniItem;
  question: DailyQuestionItem | null;
  activity: DailyActivityItem | null;
  dharmaPoints: DharmaSummary;
}

export interface DailyHistoryEntry {
  id: number;
  contentDate: string;
  pointsAwarded: number;
  createdAt: string;
}

/** One calendar day's totals — the unit the history calendar digest renders per cell. */
export interface DailyPracticeDaySummary {
  date: string;
  points: number;
  reflected: boolean;
  questionAnswered: boolean;
  activityAnswered: boolean;
}

export interface DailyHistorySummary {
  month: string;
  days: DailyPracticeDaySummary[];
  dharmaPoints: DharmaSummary;
  /** Consecutive days (ending today or yesterday) with all three of a
   * reflection, a question answer and an activity answer. */
  streak: number;
}

/** Full submission content for one date — fetched only once a devotee opens that day. */
export interface DailyHistoryDayDetail {
  date: string;
  reflection: (DailyHistoryEntry & { reflectionText: string; quote: string | null }) | null;
  question: (DailyHistoryEntry & { questionText: string; options: string[]; selectedIndex: number; correctIndex: number; isCorrect: boolean }) | null;
  activity: (DailyHistoryEntry & { prompt: string; submittedAnswer: string; correctAnswer: string | null; isCorrect: boolean }) | null;
}

type TokenGetter = () => Promise<string | null | undefined>;

async function authedGet<T>(url: string, getToken: TokenGetter): Promise<T> {
  const token = await getToken();
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export const dailyTodayQuery = (getToken: TokenGetter) => ({
  queryKey: ["daily", "today"] as const,
  queryFn: () => authedGet<DailyToday>("/api/daily/today", getToken),
});

export const dailyPointsQuery = (getToken: TokenGetter) => ({
  queryKey: ["daily", "points"] as const,
  queryFn: () => authedGet<DharmaSummary>("/api/daily/points", getToken),
});

export const dailyHistorySummaryQuery = (getToken: TokenGetter, month: string) => ({
  queryKey: ["daily", "history", "summary", month] as const,
  queryFn: () => authedGet<DailyHistorySummary>(`/api/daily/history/summary?month=${encodeURIComponent(month)}`, getToken),
});

export const dailyHistoryDayQuery = (getToken: TokenGetter, date: string) => ({
  queryKey: ["daily", "history", "day", date] as const,
  queryFn: () => authedGet<DailyHistoryDayDetail>(`/api/daily/history/day?date=${encodeURIComponent(date)}`, getToken),
});
