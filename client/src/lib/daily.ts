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

export interface DailyHistory {
  reflections: (DailyHistoryEntry & { reflectionText: string; quote: string | null })[];
  questions: (DailyHistoryEntry & { questionText: string; options: string[]; selectedIndex: number; correctIndex: number; isCorrect: boolean })[];
  activities: (DailyHistoryEntry & { prompt: string; submittedAnswer: string; correctAnswer: string | null; isCorrect: boolean })[];
  dharmaPoints: DharmaSummary;
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

export const dailyHistoryQuery = (getToken: TokenGetter) => ({
  queryKey: ["daily", "history"] as const,
  queryFn: () => authedGet<DailyHistory>("/api/daily/history", getToken),
});
