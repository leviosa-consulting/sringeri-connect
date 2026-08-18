import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Quote, HelpCircle, Puzzle, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  dailyHistorySummaryQuery,
  dailyHistoryDayQuery,
  type DailyPracticeDaySummary,
} from "@/lib/daily";

function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000);
  return ist.toISOString().split("T")[0];
}

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDayHeading(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function Points({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
      +{value}
    </span>
  );
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface DayCellInfo {
  dateStr: string;
  day: number;
  summary: DailyPracticeDaySummary | undefined;
  isToday: boolean;
}

/**
 * Shared calendar digest for Daily Practice history — used in both Account
 * History and the Daily Practice menu so the two surfaces stay identical.
 * Only the currently viewed month's totals and, on tap, one day's full
 * content are fetched — nothing scales with total history length.
 */
export default function DailyPracticeCalendar({
  emptyStateText,
  onTotalsChange,
  className,
}: {
  emptyStateText: string;
  onTotalsChange?: (totals: { total: number; streak: number }) => void;
  className?: string;
}) {
  const { user, getToken } = useAuth();
  const currentMonth = useMemo(() => todayIST().slice(0, 7), []);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    ...dailyHistorySummaryQuery(getToken, viewMonth),
    enabled: !!user,
  });

  const { data: dayDetail, isLoading: dayLoading } = useQuery({
    ...dailyHistoryDayQuery(getToken, selectedDate ?? ""),
    enabled: !!user && !!selectedDate,
  });

  useEffect(() => {
    if (summaryData) {
      onTotalsChange?.({ total: summaryData.dharmaPoints.total, streak: summaryData.streak });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryData]);

  // Collapse the open day detail whenever the visible month changes.
  useEffect(() => {
    setSelectedDate(null);
  }, [viewMonth]);

  const summaryByDate = useMemo(() => {
    const map = new Map<string, DailyPracticeDaySummary>();
    for (const day of summaryData?.days ?? []) map.set(day.date, day);
    return map;
  }, [summaryData]);

  const cells = useMemo(() => {
    const [year, m] = viewMonth.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const firstWeekday = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
    const today = todayIST();
    const list: (DayCellInfo | null)[] = new Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewMonth}-${String(day).padStart(2, "0")}`;
      list.push({ dateStr, day, summary: summaryByDate.get(dateStr), isToday: dateStr === today });
    }
    return list;
  }, [viewMonth, summaryByDate]);

  if (!user) return null;

  const monthHasEntries = (summaryData?.days.length ?? 0) > 0;
  const neverPracticed = !!summaryData && summaryData.dharmaPoints.total === 0 && !monthHasEntries;
  const isCurrentOrFutureMonth = viewMonth >= currentMonth;

  return (
    <div className={cn("space-y-3", className)} data-testid="daily-practice-calendar">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setViewMonth(m => addMonths(m, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
          data-testid="button-calendar-prev-month"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground" data-testid="text-calendar-month">
          {monthLabel(viewMonth)}
        </span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          disabled={isCurrentOrFutureMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
          data-testid="button-calendar-next-month"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {summaryLoading && (
        <div className="flex justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {!summaryLoading && (
        <>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="text-[10px] font-semibold text-muted-foreground/60 uppercase pb-1">
                {label}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell) return <div key={`blank-${i}`} />;
              const { dateStr, day, summary, isToday } = cell;
              const practiced = !!summary;
              const fullyCompleted = !!summary && summary.reflected && summary.questionAnswered && summary.activityAnswered;
              const selected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => practiced && setSelectedDate(selected ? null : dateStr)}
                  disabled={!practiced}
                  data-testid={`calendar-day-${dateStr}`}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-all",
                    !practiced && "text-muted-foreground/40 cursor-default",
                    practiced && "cursor-pointer font-semibold active:scale-95",
                    practiced && !fullyCompleted && "bg-amber-100 text-amber-800 hover:bg-amber-200",
                    fullyCompleted && "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                    selected && "ring-2 ring-primary ring-offset-1",
                    isToday && !selected && "ring-1 ring-primary/50",
                  )}
                >
                  <span>{day}</span>
                  {practiced && summary!.points > 0 && (
                    <span className="text-[8px] font-bold leading-none">+{summary!.points}</span>
                  )}
                </button>
              );
            })}
          </div>

          {neverPracticed && (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-calendar-empty">
              {emptyStateText}
            </p>
          )}

          {!neverPracticed && !monthHasEntries && (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-calendar-month-empty">
              No practice recorded in {monthLabel(viewMonth)}.
            </p>
          )}
        </>
      )}

      {selectedDate && (
        <div className="rounded-xl bg-card border border-border/50 p-3.5 space-y-3" data-testid="calendar-day-detail">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{formatDayHeading(selectedDate)}</span>
            <button
              onClick={() => setSelectedDate(null)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted"
              data-testid="button-close-day-detail"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {dayLoading && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}

          {!dayLoading && dayDetail && (
            <div className="space-y-3">
              {dayDetail.reflection && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Quote className="w-3.5 h-3.5" /> Guruvani reflection
                  </div>
                  <div className="flex items-center gap-2">
                    <Points value={dayDetail.reflection.pointsAwarded} />
                  </div>
                  {dayDetail.reflection.quote && (
                    <p className="text-xs italic text-muted-foreground">{dayDetail.reflection.quote}</p>
                  )}
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{dayDetail.reflection.reflectionText}</p>
                </div>
              )}

              {dayDetail.question && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <HelpCircle className="w-3.5 h-3.5" /> Question of the Day
                  </div>
                  <div className="flex items-center gap-2">
                    {dayDetail.question.isCorrect ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <Points value={dayDetail.question.pointsAwarded} />
                  </div>
                  <p className="text-sm text-foreground/80">{dayDetail.question.questionText}</p>
                  <p className="text-xs text-muted-foreground">
                    You answered <span className="font-medium">{dayDetail.question.options[dayDetail.question.selectedIndex]}</span>
                    {!dayDetail.question.isCorrect && (
                      <> · Correct answer <span className="font-medium">{dayDetail.question.options[dayDetail.question.correctIndex]}</span></>
                    )}
                  </p>
                </div>
              )}

              {dayDetail.activity && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Puzzle className="w-3.5 h-3.5" /> Activity of the Day
                  </div>
                  <div className="flex items-center gap-2">
                    {dayDetail.activity.isCorrect ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <Points value={dayDetail.activity.pointsAwarded} />
                  </div>
                  <p className="text-sm text-foreground/80">{dayDetail.activity.prompt}</p>
                  <p className="text-xs text-muted-foreground">
                    You answered <span className="font-medium">{dayDetail.activity.submittedAnswer}</span>
                    {!dayDetail.activity.isCorrect && dayDetail.activity.correctAnswer && (
                      <> · Correct answer <span className="font-medium">{dayDetail.activity.correctAnswer}</span></>
                    )}
                  </p>
                </div>
              )}

              {!dayDetail.reflection && !dayDetail.question && !dayDetail.activity && (
                <p className="text-sm text-muted-foreground">No practice recorded for this day.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
