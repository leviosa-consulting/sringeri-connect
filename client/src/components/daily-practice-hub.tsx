import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Flame, Flower2, Quote, HelpCircle, Puzzle, ArrowRight, Check, X, Loader2, CalendarDays,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { dailyTodayQuery, dailyHistoryQuery, type DailyHistory } from "@/lib/daily";

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

interface TimelineItem {
  key: string;
  date: string;
  kind: "reflection" | "question" | "activity";
  points: number;
  summary: string;
  correct?: boolean;
}

const KIND_META = {
  reflection: { icon: Quote, label: "Guruvani reflection" },
  question: { icon: HelpCircle, label: "Question of the Day" },
  activity: { icon: Puzzle, label: "Activity of the Day" },
} as const;

function TimelineRow({ item }: { item: TimelineItem }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-2.5 py-2" data-testid={`timeline-item-${item.key}`}>
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground/70">{meta.label}</span>
          {item.correct !== undefined && (
            item.correct
              ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              : <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          )}
        </div>
        <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{item.summary}</p>
      </div>
      {item.points > 0 && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
          +{item.points}
        </span>
      )}
    </div>
  );
}

function PracticeCard({
  icon: Icon,
  title,
  description,
  done,
}: {
  icon: typeof Quote;
  title: string;
  description: string;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-center gap-3",
        done ? "bg-emerald-50/70 border-emerald-200" : "bg-white/70 border-primary/10"
      )}
      data-testid={`hub-practice-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
        done ? "bg-emerald-100" : "bg-primary/10"
      )}>
        {done ? <Check className="w-4 h-4 text-emerald-600" /> : <Icon className="w-4 h-4 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{done ? "Done for today" : description}</p>
      </div>
    </div>
  );
}

export default function DailyPracticeHub() {
  const { user, getToken } = useAuth();
  const [, setLocation] = useLocation();

  const { data: today } = useQuery({
    ...dailyTodayQuery(getToken),
    enabled: !!user,
  });

  const { data: history, isLoading: historyLoading } = useQuery<DailyHistory>({
    ...dailyHistoryQuery(getToken),
    enabled: !!user,
  });

  const groupedByDate = useMemo(() => {
    if (!history) return [] as { date: string; points: number; items: TimelineItem[] }[];
    const items: TimelineItem[] = [
      ...history.reflections.map(r => ({
        key: `r-${r.id}`, date: r.contentDate, kind: "reflection" as const,
        points: r.pointsAwarded, summary: r.reflectionText,
      })),
      ...history.questions.map(q => ({
        key: `q-${q.id}`, date: q.contentDate, kind: "question" as const,
        points: q.pointsAwarded, summary: q.questionText, correct: q.isCorrect,
      })),
      ...history.activities.map(a => ({
        key: `a-${a.id}`, date: a.contentDate, kind: "activity" as const,
        points: a.pointsAwarded, summary: a.prompt, correct: a.isCorrect,
      })),
    ];
    const byDate = new Map<string, TimelineItem[]>();
    for (const item of items) {
      if (!byDate.has(item.date)) byDate.set(item.date, []);
      byDate.get(item.date)!.push(item);
    }
    return Array.from(byDate.keys()).sort().reverse().map(date => ({
      date,
      points: byDate.get(date)!.reduce((s, i) => s + i.points, 0),
      items: byDate.get(date)!,
    }));
  }, [history]);

  const openToday = () => setLocation("/home?openToday=1");

  const totalPoints = history?.dharmaPoints.total ?? today?.dharmaPoints.total ?? 0;
  const streak = history?.streak ?? 0;

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5" data-testid="daily-practice-hub">
      <div className="space-y-1">
        <h1 className="text-xl font-serif font-bold text-primary flex items-center gap-2" data-testid="text-hub-title">
          <Flower2 className="w-5 h-5" />
          Daily Practice
        </h1>
        <p className="text-xs text-muted-foreground">
          Reflect, answer and play a little each day to earn Dharma Points
        </p>
      </div>

      {/* ---------------- Points + Streak ---------------- */}
      <div className="rounded-xl overflow-hidden border border-border/50 shadow-sm" data-testid="hub-stats-card">
        <div className="bg-gradient-to-br from-primary via-orange-500 to-amber-500 p-5 text-white text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px, 40px 40px, 50px 50px",
            }}
          />
          <div className="relative">
            <p className="text-xs font-medium text-white/70 uppercase tracking-widest mb-1">Dharma Points</p>
            <p className="text-4xl font-bold font-serif tracking-tight" data-testid="text-hub-total-points">{totalPoints}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 bg-card">
          <div className="py-3 text-center flex items-center justify-center gap-1.5" data-testid="hub-streak-counter">
            <Flame className={cn("w-4 h-4", streak > 0 ? "text-orange-500" : "text-muted-foreground/40")} />
            <span className={cn("text-sm font-bold", streak > 0 ? "text-orange-600" : "text-muted-foreground")}>
              {streak} day{streak !== 1 ? "s" : ""} streak
            </span>
            <span className="text-[10px] text-muted-foreground">
              (Guruvani + Question + Activity, every day)
            </span>
          </div>
        </div>
      </div>

      {/* ---------------- Today's practice ---------------- */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-serif font-bold text-foreground">Today's practice</h2>
        <PracticeCard
          icon={Quote}
          title="Guruvani"
          description="Reflect on today's quote"
          done={!!today?.guruvani.reflected}
        />
        <PracticeCard
          icon={HelpCircle}
          title="Question of the Day"
          description="Answer today's question"
          done={!!today?.question?.answered}
        />
        <PracticeCard
          icon={Puzzle}
          title="Activity of the Day"
          description="Try today's activity"
          done={!!today?.activity?.answered}
        />
        <button
          onClick={openToday}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-primary text-white text-sm font-semibold active:scale-95 transition-all"
          data-testid="button-open-today"
        >
          Open Today <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ---------------- Timeline ---------------- */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-serif font-bold text-foreground flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-primary" />
          Your practice history
        </h2>

        {historyLoading && (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!historyLoading && groupedByDate.length === 0 && (
          <div className="text-center py-10 space-y-2" data-testid="text-hub-history-empty">
            <p className="text-muted-foreground font-medium">No entries yet</p>
            <p className="text-sm text-muted-foreground/70">Open Today above to start your practice.</p>
          </div>
        )}

        {!historyLoading && groupedByDate.map(({ date, points, items }) => (
          <div key={date} className="bg-card rounded-xl border border-border/50 p-3.5" data-testid={`timeline-date-${date}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/70">{formatDate(date)}</span>
              {points > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  +{points} that day
                </span>
              )}
            </div>
            <div className="divide-y divide-border/30">
              {items.map(item => <TimelineRow key={item.key} item={item} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
