import { useState, useEffect, useRef } from "react";
import {
  Calendar, BookOpen, Quote, Sparkles, ArrowRight, Landmark,
  Loader2, Check, X, Flower2, PencilLine, Puzzle, HelpCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { DailyToday } from "@/lib/daily";
import { dailyTodayQuery } from "@/lib/daily";

interface TodayDetails {
  todayWebsiteKannada?: string;
  todayWebsiteEnglish?: string;
  occasion?: string;
  occasionK?: string;
  samvatsara?: string;
  samvatsaraK?: string;
  chandraMasa?: string;
  chandraMasaK?: string;
  tithi?: string;
  tithiK?: string;
  nakshatra?: string;
  nakshatraK?: string;
}

interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  url: string;
}

interface Stotra {
  id: string;
  title: string;
  titleEn: string;
  deityName: string;
  deityNameEn: string;
  url: string;
  totalShlokas: number;
}

interface TodayDrawerProps {
  open: boolean;
  onClose: () => void;
  todayDetails: TodayDetails | null;
  formattedDate: string;
}

function SectionCard({
  icon: Icon,
  label,
  points,
  earned,
  children,
  testId,
}: {
  icon: typeof Quote;
  label: string;
  points?: number | null;
  earned?: boolean;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section
      className="bg-white/70 rounded-2xl border border-primary/10 p-4 shadow-sm"
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.15em]">{label}</span>
        </div>
        {typeof points === "number" && points > 0 && (
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              earned ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
            )}
          >
            {earned ? `+${points} earned` : `${points} ${points === 1 ? "point" : "points"}`}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Feedback({ isCorrect, explanation, answerLabel }: { isCorrect: boolean; explanation?: string | null; answerLabel?: string | null }) {
  return (
    <div
      className={cn(
        "mt-3 rounded-xl p-3 text-sm",
        isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
      )}
      data-testid="daily-feedback"
    >
      <div className="flex items-center gap-2 font-semibold">
        {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        {isCorrect ? "Correct" : "Not quite"}
      </div>
      {!isCorrect && answerLabel && (
        <p className="mt-1 text-xs">The answer was <span className="font-semibold">{answerLabel}</span>.</p>
      )}
      {explanation && <p className="mt-1 text-xs leading-relaxed opacity-90">{explanation}</p>}
    </div>
  );
}

export default function TodayDrawer({ open, onClose, todayDetails, formattedDate }: TodayDrawerProps) {
  const { user, getToken } = useAuth();
  const queryClient = useQueryClient();
  const [stotra, setStotra] = useState<Stotra | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    if (open && !dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetch("/api/stotra-of-the-day")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.stotra) setStotra(data.stotra); })
        .catch(() => {});
      fetch("/api/article-of-the-day")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.article) setArticle(data.article); })
        .catch(() => {});
    }
  }, [open]);

  const { data: daily, isLoading: dailyLoading } = useQuery<DailyToday>({
    ...dailyTodayQuery(getToken),
    enabled: open && !!user,
  });

  const [reflection, setReflection] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [activityAnswer, setActivityAnswer] = useState("");
  const [activityOption, setActivityOption] = useState<number | null>(null);
  const [error, setError] = useState("");

  // If the day rolls over (or the scheduled items change) while the drawer is
  // mounted, clear any half-finished input so it cannot be submitted against
  // the new day's content.
  const dailyKey = daily
    ? [daily.date, daily.question?.id ?? "-", daily.activity?.id ?? "-"].join("|")
    : "";
  useEffect(() => {
    setReflection("");
    setSelectedOption(null);
    setActivityAnswer("");
    setActivityOption(null);
    setError("");
  }, [dailyKey]);

  const post = async (url: string, body: unknown) => {
    const token = await getToken();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
    return data;
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["daily", "today"] });
    queryClient.invalidateQueries({ queryKey: ["daily", "points"] });
    queryClient.invalidateQueries({ queryKey: ["daily", "history"] });
  };

  const reflectMutation = useMutation({
    mutationFn: (text: string) => post("/api/daily/guruvani/reflect", { reflectionText: text }),
    onSuccess: () => { setError(""); refresh(); },
    onError: (e: Error) => setError(e.message),
  });

  const questionMutation = useMutation({
    mutationFn: (index: number) => post("/api/daily/question/answer", { selectedIndex: index }),
    onSuccess: () => { setError(""); refresh(); },
    onError: (e: Error) => setError(e.message),
  });

  const activityMutation = useMutation({
    mutationFn: (payload: { answer?: string; selectedIndex?: number }) => post("/api/daily/activity/answer", payload),
    onSuccess: () => { setError(""); refresh(); },
    onError: (e: Error) => setError(e.message),
  });

  const guruvani = daily?.guruvani;
  const question = daily?.question;
  const activity = daily?.activity;
  const hasOccasion = !!(todayDetails?.occasionK || todayDetails?.occasion);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl h-[88vh] bg-gradient-to-b from-[#FFF9F0] to-[#F0E6D6] flex flex-col p-0 [&>button:last-child]:top-3 [&>button:last-child]:right-4"
        data-testid="today-drawer-sheet"
      >
        <VisuallyHidden>
          <SheetTitle>Today's practice</SheetTitle>
        </VisuallyHidden>

        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-primary/10">
          <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em]">{formattedDate}</div>
          <div className="flex items-center justify-between gap-3 mt-1 pr-8">
            <h2 className="text-xl font-serif font-bold text-foreground">Today</h2>
            {daily && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary"
                data-testid="today-dharma-points"
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">
                  {daily.dharmaPoints.total} Dharma Points
                </span>
                {daily.dharmaPoints.today > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-700">+{daily.dharmaPoints.today} today</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2" data-testid="text-daily-error">{error}</div>
          )}

          {dailyLoading && (
            <div className="flex items-center justify-center py-8 text-foreground/50">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {/* ---------------- Guruvani ---------------- */}
          {guruvani && (
            <SectionCard
              icon={Quote}
              label="Guruvani"
              points={guruvani.points}
              earned={guruvani.reflected}
              testId="section-guruvani"
            >
              <p className="text-base font-serif italic text-foreground leading-relaxed" data-testid="text-guruvani-quote">
                {guruvani.quote}
              </p>
              <p className="text-[11px] text-foreground/50 mt-2">— {guruvani.attribution}</p>

              <div className="h-px bg-primary/10 my-3" />

              {guruvani.reflected ? (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Check className="w-3.5 h-3.5" /> Your reflection is saved
                  </div>
                  <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap" data-testid="text-my-reflection">
                    {guruvani.reflectionText}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70 mb-2">
                    <PencilLine className="w-3.5 h-3.5 text-primary" />
                    What does this mean to you today?
                  </label>
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Write a few lines. Your reflection is private."
                    className="w-full rounded-xl border border-primary/15 bg-white/80 p-3 text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    data-testid="input-reflection"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-foreground/40">{reflection.length}/2000 · Private to you</span>
                    <button
                      onClick={() => reflectMutation.mutate(reflection.trim())}
                      disabled={!reflection.trim() || reflectMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold disabled:opacity-50 active:scale-95 transition-all"
                      data-testid="button-save-reflection"
                    >
                      {reflectMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save reflection
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* ---------------- Question of the Day ---------------- */}
          {question ? (
            <SectionCard
              icon={HelpCircle}
              label="Question of the Day"
              points={question.points}
              earned={!!question.isCorrect}
              testId="section-question-of-day"
            >
              <p className="text-sm font-medium text-foreground leading-relaxed" data-testid="text-question">
                {question.questionText}
              </p>
              <div className="mt-3 space-y-2">
                {question.options.map((option, idx) => {
                  const chosen = question.answered ? question.selectedIndex === idx : selectedOption === idx;
                  const isAnswerKey = question.answered && question.correctIndex === idx;
                  return (
                    <button
                      key={idx}
                      disabled={question.answered || questionMutation.isPending}
                      onClick={() => setSelectedOption(idx)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors",
                        isAnswerKey
                          ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                          : chosen && question.answered
                            ? "border-rose-300 bg-rose-50 text-rose-900"
                            : chosen
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-primary/15 bg-white/70 text-foreground/80",
                        question.answered && "cursor-default"
                      )}
                      data-testid={`option-question-${idx}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {question.answered ? (
                <Feedback
                  isCorrect={!!question.isCorrect}
                  explanation={question.explanation}
                  answerLabel={typeof question.correctIndex === "number" ? question.options[question.correctIndex] : null}
                />
              ) : (
                <button
                  onClick={() => selectedOption !== null && questionMutation.mutate(selectedOption)}
                  disabled={selectedOption === null || questionMutation.isPending}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
                  data-testid="button-submit-question"
                >
                  {questionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit answer
                </button>
              )}
              <p className="mt-2 text-[10px] text-foreground/40">One attempt a day. Points are awarded for a correct answer.</p>
            </SectionCard>
          ) : daily && (
            <SectionCard icon={HelpCircle} label="Question of the Day" testId="section-question-of-day">
              <p className="text-sm text-foreground/50">No question has been set for today.</p>
            </SectionCard>
          )}

          {/* ---------------- Activity of the Day ---------------- */}
          {activity ? (
            <SectionCard
              icon={Puzzle}
              label="Activity of the Day"
              points={activity.points}
              earned={!!activity.isCorrect}
              testId="section-activity-of-day"
            >
              <p className="text-sm font-medium text-foreground leading-relaxed" data-testid="text-activity-prompt">
                {activity.prompt}
              </p>

              {activity.imageUrl && (
                <img
                  src={activity.imageUrl}
                  alt="Activity of the day"
                  className="mt-3 w-full max-h-56 object-contain rounded-xl bg-white/60"
                  data-testid="img-activity"
                />
              )}

              {activity.answerMode === "options" && activity.options ? (
                <div className="mt-3 space-y-2">
                  {activity.options.map((option, idx) => {
                    const chosen = activity.answered ? activity.submittedAnswer === option : activityOption === idx;
                    const isAnswerKey = activity.answered && activity.correctIndex === idx;
                    return (
                      <button
                        key={idx}
                        disabled={activity.answered || activityMutation.isPending}
                        onClick={() => setActivityOption(idx)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors",
                          isAnswerKey
                            ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                            : chosen && activity.answered
                              ? "border-rose-300 bg-rose-50 text-rose-900"
                              : chosen
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-primary/15 bg-white/70 text-foreground/80",
                          activity.answered && "cursor-default"
                        )}
                        data-testid={`option-activity-${idx}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3">
                  {activity.answered ? (
                    <div className="px-3 py-2.5 rounded-xl border border-primary/15 bg-white/70 text-sm text-foreground/80" data-testid="text-activity-submitted">
                      {activity.submittedAnswer}
                    </div>
                  ) : (
                    <input
                      value={activityAnswer}
                      onChange={(e) => setActivityAnswer(e.target.value)}
                      maxLength={500}
                      placeholder="Type your answer"
                      className="w-full rounded-xl border border-primary/15 bg-white/80 px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-activity-answer"
                    />
                  )}
                </div>
              )}

              {activity.answered ? (
                <Feedback
                  isCorrect={!!activity.isCorrect}
                  explanation={activity.explanation}
                  answerLabel={activity.correctAnswer}
                />
              ) : (
                <button
                  onClick={() => {
                    if (activity.answerMode === "options") {
                      if (activityOption !== null) activityMutation.mutate({ selectedIndex: activityOption });
                    } else if (activityAnswer.trim()) {
                      activityMutation.mutate({ answer: activityAnswer.trim() });
                    }
                  }}
                  disabled={
                    activityMutation.isPending ||
                    (activity.answerMode === "options" ? activityOption === null : !activityAnswer.trim())
                  }
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
                  data-testid="button-submit-activity"
                >
                  {activityMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit answer
                </button>
              )}
              <p className="mt-2 text-[10px] text-foreground/40">One attempt a day. Points are awarded for a correct answer.</p>
            </SectionCard>
          ) : daily && (
            <SectionCard icon={Puzzle} label="Activity of the Day" testId="section-activity-of-day">
              <p className="text-sm text-foreground/50">No activity has been set for today.</p>
            </SectionCard>
          )}

          {/* ---------------- Panchanga & the rest of the day ---------------- */}
          {todayDetails && (
            <SectionCard icon={Calendar} label="Panchanga" testId="section-panchanga">
              {todayDetails.todayWebsiteKannada && (
                <div
                  className="text-lg font-serif text-foreground leading-relaxed text-center"
                  style={{ fontFamily: "'Noto Serif Kannada', 'Merriweather', serif" }}
                >
                  {todayDetails.todayWebsiteKannada}
                </div>
              )}
              {todayDetails.todayWebsiteEnglish && (
                <div className="text-sm text-foreground/60 mt-1 text-center">{todayDetails.todayWebsiteEnglish}</div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  { labelEn: "Samvatsara", valueEn: todayDetails.samvatsara, valueKn: todayDetails.samvatsaraK },
                  { labelEn: "Chandra Masa", valueEn: todayDetails.chandraMasa, valueKn: todayDetails.chandraMasaK },
                  { labelEn: "Tithi", valueEn: todayDetails.tithi, valueKn: todayDetails.tithiK },
                  { labelEn: "Nakshatra", valueEn: todayDetails.nakshatra, valueKn: todayDetails.nakshatraK },
                ].map((d) => (
                  <div key={d.labelEn} className="bg-white/60 rounded-xl p-2.5 text-center border border-primary/8">
                    <div className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-0.5">{d.labelEn}</div>
                    <div className="text-sm font-serif font-bold text-foreground">{d.valueEn}</div>
                    {d.valueKn && (
                      <div className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: "'Noto Serif Kannada', serif" }}>{d.valueKn}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-center">
                <a
                  href="https://sringeri-panchangam.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  data-testid="link-panchanga-drawer"
                >
                  Complete Panchanga <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </SectionCard>
          )}

          {hasOccasion && (
            <SectionCard icon={Sparkles} label="Occasion" testId="section-occasion">
              {todayDetails?.occasionK && (
                <div
                  className="text-lg font-serif text-foreground leading-relaxed"
                  style={{ fontFamily: "'Noto Serif Kannada', 'Merriweather', serif" }}
                >
                  {todayDetails.occasionK}
                </div>
              )}
              {todayDetails?.occasion && (
                <div className="text-sm text-foreground/70 leading-relaxed mt-1">{todayDetails.occasion}</div>
              )}
            </SectionCard>
          )}

          <SectionCard icon={BookOpen} label="Stotra of the Day" testId="section-stotra">
            {stotra ? (
              <>
                <h3
                  className="text-xl font-serif font-bold text-foreground"
                  style={{ fontFamily: "'Noto Serif Devanagari', 'Merriweather', serif" }}
                  data-testid="text-stotra-title"
                >
                  {stotra.title}
                </h3>
                {stotra.titleEn && stotra.titleEn !== stotra.title && (
                  <p className="text-sm text-foreground/60 italic mt-0.5" data-testid="text-stotra-title-en">{stotra.titleEn}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-foreground/50 mt-2">
                  <span data-testid="text-stotra-deity">{stotra.deityName || stotra.deityNameEn}</span>
                  {stotra.totalShlokas > 0 && (
                    <>
                      <span>•</span>
                      <span data-testid="text-stotra-shlokas">{stotra.totalShlokas} shlokas</span>
                    </>
                  )}
                </div>
                <a
                  href={stotra.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  data-testid="link-full-stotra"
                >
                  Read on sringeri.net <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <p className="text-sm text-foreground/50">Loading…</p>
            )}
          </SectionCard>

          <SectionCard icon={Landmark} label="Article of the Day" testId="section-article">
            {article ? (
              <>
                <h3 className="text-base font-serif font-bold text-foreground leading-snug" data-testid="text-article-title">
                  {article.title}
                </h3>
                {article.description && (
                  <p className="text-sm text-foreground/60 leading-relaxed line-clamp-4 mt-1.5" data-testid="text-article-description">
                    {article.description}…
                  </p>
                )}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  data-testid="link-article"
                >
                  Read on sringeri.net <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <p className="text-sm text-foreground/50">Loading…</p>
            )}
          </SectionCard>

          <div className="h-2" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
