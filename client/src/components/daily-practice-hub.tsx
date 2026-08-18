import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Flame, Flower2, Quote, HelpCircle, Puzzle, ArrowRight, Check, CalendarDays,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { dailyTodayQuery } from "@/lib/daily";
import DailyPracticeCalendar from "@/components/daily-practice-calendar";

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
  const [totals, setTotals] = useState({ total: 0, streak: 0 });

  const { data: today } = useQuery({
    ...dailyTodayQuery(getToken),
    enabled: !!user,
  });

  const openToday = () => setLocation("/home?openToday=1");

  const totalPoints = totals.total || today?.dharmaPoints.total || 0;
  const streak = totals.streak;

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

      {/* ---------------- History calendar ---------------- */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-serif font-bold text-foreground flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-primary" />
          Your practice history
        </h2>

        <DailyPracticeCalendar
          emptyStateText="No entries yet. Open Today above to start your practice."
          onTotalsChange={setTotals}
        />
      </div>
    </div>
  );
}
