import { useQuery } from "@tanstack/react-query";
import { Flower2, Quote, HelpCircle, Puzzle, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { dailyHistoryQuery, type DailyHistory } from "@/lib/daily";

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Points({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
      +{value}
    </span>
  );
}

export default function DharmaHistory() {
  const { user, getToken } = useAuth();
  const { data, isLoading } = useQuery<DailyHistory>({
    ...dailyHistoryQuery(getToken),
    enabled: !!user,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-6 text-muted-foreground" data-testid="loading-dharma-history">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const isEmpty =
    data.reflections.length === 0 && data.questions.length === 0 && data.activities.length === 0;

  return (
    <div className="space-y-4" data-testid="section-dharma-history">
      <div className="flex items-center gap-2">
        <Flower2 className="w-4 h-4 text-[#ff6600]" />
        <h3 className="font-serif font-bold text-base">Daily Practice</h3>
        <span className="ml-auto text-sm font-semibold text-foreground/70" data-testid="text-dharma-history-total">
          {data.dharmaPoints.total} points
        </span>
      </div>

      {isEmpty && (
        <p className="text-sm text-muted-foreground" data-testid="text-dharma-history-empty">
          You have not taken part in the daily practice yet. Open Today on the home page to begin.
        </p>
      )}

      {data.reflections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Quote className="w-3.5 h-3.5" /> Guruvani reflections
          </div>
          {data.reflections.map((r) => (
            <div key={r.id} className="p-3 rounded-xl bg-card border border-border/50" data-testid={`history-reflection-${r.id}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground/70">{formatDate(r.contentDate)}</span>
                <Points value={r.pointsAwarded} />
              </div>
              {r.quote && <p className="text-xs italic text-muted-foreground mt-1.5 line-clamp-2">{r.quote}</p>}
              <p className="text-sm text-foreground/80 mt-1.5 whitespace-pre-wrap">{r.reflectionText}</p>
            </div>
          ))}
        </div>
      )}

      {data.questions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5" /> Questions of the Day
          </div>
          {data.questions.map((q) => (
            <div key={q.id} className="p-3 rounded-xl bg-card border border-border/50" data-testid={`history-question-${q.id}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground/70">{formatDate(q.contentDate)}</span>
                {q.isCorrect ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-500" />
                )}
                <Points value={q.pointsAwarded} />
              </div>
              <p className="text-sm text-foreground/80 mt-1.5">{q.questionText}</p>
              <p className="text-xs text-muted-foreground mt-1">
                You answered <span className="font-medium">{q.options[q.selectedIndex]}</span>
                {!q.isCorrect && (
                  <> · Correct answer <span className="font-medium">{q.options[q.correctIndex]}</span></>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.activities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Puzzle className="w-3.5 h-3.5" /> Activities of the Day
          </div>
          {data.activities.map((a) => (
            <div key={a.id} className="p-3 rounded-xl bg-card border border-border/50" data-testid={`history-activity-${a.id}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground/70">{formatDate(a.contentDate)}</span>
                {a.isCorrect ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-500" />
                )}
                <Points value={a.pointsAwarded} />
              </div>
              <p className="text-sm text-foreground/80 mt-1.5">{a.prompt}</p>
              <p className="text-xs text-muted-foreground mt-1">
                You answered <span className="font-medium">{a.submittedAnswer}</span>
                {!a.isCorrect && a.correctAnswer && (
                  <> · Correct answer <span className="font-medium">{a.correctAnswer}</span></>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
