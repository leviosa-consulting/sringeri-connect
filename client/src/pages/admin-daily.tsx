import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Plus, Trash2, Check, Eye, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { RangoliLoader } from "@/components/rangoli-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface GuruvaniInfo {
  quote: string;
  attribution: string;
  points: number;
}

interface QuestionForm {
  questionText: string;
  options: string[];
  correctIndex: number;
  points: number;
  explanation: string;
}

interface ActivityForm {
  activityType: string;
  answerMode: "text" | "options";
  prompt: string;
  imageUrl: string;
  options: string[];
  correctIndex: number;
  correctAnswer: string;
  points: number;
  explanation: string;
}

interface DateRow {
  contentDate: string;
  hasQuestion: boolean;
  hasActivity: boolean;
}

interface Submissions {
  reflections: { id: number; odUserId: string; reflectionText: string; pointsAwarded: number }[];
  questions: { id: number; odUserId: string; selectedIndex: number; isCorrect: boolean; pointsAwarded: number; options: string[] }[];
  activities: { id: number; odUserId: string; submittedAnswer: string; isCorrect: boolean; pointsAwarded: number }[];
}

const EMPTY_QUESTION: QuestionForm = { questionText: "", options: ["", ""], correctIndex: 0, points: 1, explanation: "" };
const EMPTY_ACTIVITY: ActivityForm = {
  activityType: "anagram", answerMode: "text", prompt: "", imageUrl: "",
  options: ["", ""], correctIndex: 0, correctAnswer: "", points: 2, explanation: "",
};

function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + 5.5 * 3600000);
  return ist.toISOString().split("T")[0];
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminDaily() {
  const { user, getToken, hasAdminRole } = useAuth();
  const isAdmin = hasAdminRole("quiz");

  const [date, setDate] = useState(todayIST());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dates, setDates] = useState<DateRow[]>([]);

  const [questionOn, setQuestionOn] = useState(false);
  const [activityOn, setActivityOn] = useState(false);
  const [guruvani, setGuruvani] = useState<GuruvaniInfo>({ quote: "", attribution: "", points: 2 });
  const [question, setQuestion] = useState<QuestionForm>(EMPTY_QUESTION);
  const [activity, setActivity] = useState<ActivityForm>(EMPTY_ACTIVITY);
  const [questionFrozen, setQuestionFrozen] = useState(false);
  const [activityFrozen, setActivityFrozen] = useState(false);

  const [submissions, setSubmissions] = useState<Submissions | null>(null);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const token = await getToken();
    return fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
    });
  }, [getToken]);

  const loadDates = useCallback(async () => {
    const res = await authFetch("/api/admin/daily/dates");
    if (res.ok) setDates(await res.json());
  }, [authFetch]);

  const loadDate = useCallback(async (target: string) => {
    setLoading(true);
    setMessage("");
    setError("");
    setSubmissions(null);
    setSubmissionsOpen(false);
    try {
      const res = await authFetch(`/api/admin/daily/${target}`);
      if (!res.ok) throw new Error("Could not load this date");
      const data = await res.json();
      setQuestionFrozen(!!data.questionFrozen);
      setActivityFrozen(!!data.activityFrozen);

      // Guruvani always comes from the fixed quote pool — read-only here.
      setGuruvani({
        quote: data.guruvani?.quote || "",
        attribution: data.guruvani?.attribution || "",
        points: data.guruvani?.points ?? 2,
      });

      if (data.question) {
        setQuestionOn(true);
        setQuestion({
          questionText: data.question.questionText,
          options: data.question.options,
          correctIndex: data.question.correctIndex,
          points: data.question.points,
          explanation: data.question.explanation || "",
        });
      } else {
        setQuestionOn(false);
        setQuestion(EMPTY_QUESTION);
      }

      if (data.activity) {
        setActivityOn(true);
        setActivity({
          activityType: data.activity.activityType,
          answerMode: data.activity.answerMode,
          prompt: data.activity.prompt,
          imageUrl: data.activity.imageUrl || "",
          options: data.activity.options || ["", ""],
          correctIndex: data.activity.correctIndex ?? 0,
          correctAnswer: data.activity.correctAnswer || "",
          points: data.activity.points,
          explanation: data.activity.explanation || "",
        });
      } else {
        setActivityOn(false);
        setActivity(EMPTY_ACTIVITY);
      }
    } catch (err: any) {
      setError(err.message || "Could not load this date");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { if (isAdmin) { loadDate(date); loadDates(); } }, [isAdmin, date, loadDate, loadDates]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const body = {
        question: questionFrozen ? undefined : questionOn
          ? {
              questionText: question.questionText,
              options: question.options,
              correctIndex: question.correctIndex,
              points: Number(question.points),
              explanation: question.explanation,
            }
          : null,
        activity: activityFrozen ? undefined : activityOn
          ? {
              activityType: activity.activityType,
              answerMode: activity.answerMode,
              prompt: activity.prompt,
              imageUrl: activity.imageUrl,
              options: activity.options,
              correctIndex: activity.correctIndex,
              correctAnswer: activity.correctAnswer,
              points: Number(activity.points),
              explanation: activity.explanation,
            }
          : null,
      };
      const res = await authFetch(`/api/admin/daily/${date}`, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save");
      if (Array.isArray(data.frozen) && data.frozen.length > 0) {
        setMessage("Saved. " + data.frozen.map((f: string) => f === "question" ? "The question" : "The activity").join(" and ") + " could not be changed because devotees have already answered.");
      } else {
        setMessage("Saved");
      }
      setQuestionFrozen(!!data.questionFrozen);
      setActivityFrozen(!!data.activityFrozen);
      loadDates();
    } catch (err: any) {
      setError(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const loadSubmissions = async () => {
    setSubmissionsOpen(true);
    const res = await authFetch(`/api/admin/daily/${date}/submissions`);
    if (res.ok) setSubmissions(await res.json());
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RangoliLoader size={48} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2" data-testid="text-access-denied">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">This account cannot manage daily content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-6 max-w-3xl mx-auto" data-testid="admin-daily-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Daily Content</h1>
          <p className="text-sm text-muted-foreground">Schedule the Question and Activity that devotees see in Today. Guruvani rotates automatically from the fixed quote pool and cannot be scheduled here.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
            data-testid="input-daily-date"
          />
        </Field>
        <Button variant="outline" onClick={loadSubmissions} data-testid="button-view-submissions">
          <Users className="h-4 w-4 mr-2" /> Submissions
        </Button>
      </div>

      {dates.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="list-scheduled-dates">
          {dates.slice(0, 14).map((d) => (
            <button
              key={d.contentDate}
              onClick={() => setDate(d.contentDate)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs border",
                d.contentDate === date ? "bg-primary text-white border-primary" : "bg-card border-border/60 hover:border-primary/40"
              )}
              data-testid={`button-date-${d.contentDate}`}
            >
              {d.contentDate}
              <span className="ml-1 opacity-70">
                {d.hasQuestion ? "Q" : ""}{d.hasActivity ? "A" : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><RangoliLoader size={48} /></div>
      ) : (
        <div className="space-y-5">
          {/* ---------- Guruvani (read-only: always the pool's quote for this date) ---------- */}
          <section className="p-4 rounded-xl border border-border/60 bg-card space-y-2" data-testid="admin-section-guruvani">
            <div className="font-semibold">Guruvani</div>
            <p className="text-xs text-muted-foreground">
              Always drawn from the fixed quote pool — it cannot be authored or overridden here.
            </p>
            <div className="rounded-md bg-muted/40 p-3 space-y-1">
              <p className="text-sm italic" data-testid="text-guruvani-readonly-quote">{guruvani.quote || "—"}</p>
              {guruvani.attribution && (
                <p className="text-xs text-muted-foreground">— {guruvani.attribution}</p>
              )}
              <p className="text-[11px] text-muted-foreground">Awarded for any reflection: {guruvani.points} points</p>
            </div>
          </section>

          {/* ---------- Question ---------- */}
          <section className="p-4 rounded-xl border border-border/60 bg-card space-y-3" data-testid="admin-section-question">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={questionOn} disabled={questionFrozen} onChange={(e) => setQuestionOn(e.target.checked)} data-testid="toggle-question" />
              Question of the Day
            </label>
            {questionFrozen && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1.5" data-testid="text-question-frozen">
                Devotees have already answered this question, so it can no longer be changed. The activity for this day can still be edited.
              </p>
            )}
            {questionOn && (
              <div className={cn("space-y-3", questionFrozen && "opacity-60 pointer-events-none")}>
                <Field label="Question">
                  <textarea
                    rows={2}
                    value={question.questionText}
                    onChange={(e) => setQuestion({ ...question, questionText: e.target.value })}
                    className="w-full rounded-md border border-input bg-background p-2 text-sm"
                    data-testid="input-question-text"
                  />
                </Field>
                <Field label="Options" hint="Select the radio button next to the correct option">
                  <div className="space-y-2">
                    {question.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={question.correctIndex === idx}
                          onChange={() => setQuestion({ ...question, correctIndex: idx })}
                          data-testid={`radio-question-correct-${idx}`}
                        />
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const options = [...question.options];
                            options[idx] = e.target.value;
                            setQuestion({ ...question, options });
                          }}
                          data-testid={`input-question-option-${idx}`}
                        />
                        {question.options.length > 2 && (
                          <button
                            onClick={() => {
                              const options = question.options.filter((_, i) => i !== idx);
                              setQuestion({
                                ...question,
                                options,
                                correctIndex: Math.min(question.correctIndex, options.length - 1),
                              });
                            }}
                            className="p-2 text-muted-foreground hover:text-destructive"
                            data-testid={`button-remove-question-option-${idx}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestion({ ...question, options: [...question.options, ""] })}
                      data-testid="button-add-question-option"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add option
                    </Button>
                  </div>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Points" hint="Only a correct answer scores">
                    <Input
                      type="number"
                      min={1}
                      value={question.points}
                      onChange={(e) => setQuestion({ ...question, points: Number(e.target.value) })}
                      data-testid="input-question-points"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Explanation">
                      <Input
                        value={question.explanation}
                        onChange={(e) => setQuestion({ ...question, explanation: e.target.value })}
                        placeholder="Shown after the devotee answers"
                        data-testid="input-question-explanation"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ---------- Activity ---------- */}
          <section className="p-4 rounded-xl border border-border/60 bg-card space-y-3" data-testid="admin-section-activity">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={activityOn} disabled={activityFrozen} onChange={(e) => setActivityOn(e.target.checked)} data-testid="toggle-activity" />
              Activity of the Day
            </label>
            {activityFrozen && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1.5" data-testid="text-activity-frozen">
                Devotees have already attempted this activity, so it can no longer be changed.
              </p>
            )}
            {activityOn && (
              <div className={cn("space-y-3", activityFrozen && "opacity-60 pointer-events-none")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Type">
                    <select
                      value={activity.activityType}
                      onChange={(e) => setActivity({ ...activity, activityType: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      data-testid="select-activity-type"
                    >
                      <option value="anagram">Anagram</option>
                      <option value="picture">Picture puzzle</option>
                      <option value="riddle">Riddle</option>
                    </select>
                  </Field>
                  <Field label="Answer mode">
                    <select
                      value={activity.answerMode}
                      onChange={(e) => setActivity({ ...activity, answerMode: e.target.value as "text" | "options" })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      data-testid="select-activity-answer-mode"
                    >
                      <option value="text">Typed answer</option>
                      <option value="options">Multiple choice</option>
                    </select>
                  </Field>
                </div>

                <Field label="Prompt">
                  <textarea
                    rows={2}
                    value={activity.prompt}
                    onChange={(e) => setActivity({ ...activity, prompt: e.target.value })}
                    className="w-full rounded-md border border-input bg-background p-2 text-sm"
                    data-testid="input-activity-prompt"
                  />
                </Field>

                <Field label="Image URL" hint="Optional — used for picture puzzles">
                  <Input
                    value={activity.imageUrl}
                    onChange={(e) => setActivity({ ...activity, imageUrl: e.target.value })}
                    placeholder="https://…"
                    data-testid="input-activity-image"
                  />
                </Field>

                {activity.answerMode === "options" ? (
                  <Field label="Options" hint="Select the radio button next to the correct option">
                    <div className="space-y-2">
                      {activity.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={activity.correctIndex === idx}
                            onChange={() => setActivity({ ...activity, correctIndex: idx })}
                            data-testid={`radio-activity-correct-${idx}`}
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const options = [...activity.options];
                              options[idx] = e.target.value;
                              setActivity({ ...activity, options });
                            }}
                            data-testid={`input-activity-option-${idx}`}
                          />
                          {activity.options.length > 2 && (
                            <button
                              onClick={() => {
                                const options = activity.options.filter((_, i) => i !== idx);
                                setActivity({
                                  ...activity,
                                  options,
                                  correctIndex: Math.min(activity.correctIndex, options.length - 1),
                                });
                              }}
                              className="p-2 text-muted-foreground hover:text-destructive"
                              data-testid={`button-remove-activity-option-${idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActivity({ ...activity, options: [...activity.options, ""] })}
                        data-testid="button-add-activity-option"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add option
                      </Button>
                    </div>
                  </Field>
                ) : (
                  <Field label="Correct answer" hint="Matched ignoring case and extra spaces">
                    <Input
                      value={activity.correctAnswer}
                      onChange={(e) => setActivity({ ...activity, correctAnswer: e.target.value })}
                      data-testid="input-activity-correct-answer"
                    />
                  </Field>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Points" hint="Only a correct answer scores">
                    <Input
                      type="number"
                      min={1}
                      value={activity.points}
                      onChange={(e) => setActivity({ ...activity, points: Number(e.target.value) })}
                      data-testid="input-activity-points"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Explanation">
                      <Input
                        value={activity.explanation}
                        onChange={(e) => setActivity({ ...activity, explanation: e.target.value })}
                        placeholder="Shown after the devotee answers"
                        data-testid="input-activity-explanation"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ---------- Preview ---------- */}
          <section className="p-4 rounded-xl border border-border/60 bg-gradient-to-b from-[#FFF9F0] to-[#F0E6D6] space-y-3" data-testid="admin-daily-preview">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Eye className="h-4 w-4" /> Devotee preview
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Guruvani</div>
              <p className="text-sm italic mt-1">{guruvani.quote || "—"}</p>
            </div>
            {questionOn && (
              <div className="rounded-xl bg-white/70 p-3">
                <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Question of the Day</div>
                <p className="text-sm mt-1">{question.questionText || "—"}</p>
                <ul className="mt-2 space-y-1">
                  {question.options.map((o, i) => (
                    <li key={i} className={cn("text-xs px-2 py-1 rounded", i === question.correctIndex ? "bg-emerald-100 text-emerald-800" : "bg-black/5")}>
                      {o || "—"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activityOn && (
              <div className="rounded-xl bg-white/70 p-3">
                <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Activity of the Day</div>
                <p className="text-sm mt-1">{activity.prompt || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Answer: {activity.answerMode === "options" ? (activity.options[activity.correctIndex] || "—") : (activity.correctAnswer || "—")}
                </p>
              </div>
            )}
          </section>

          {error && <p className="text-sm text-destructive" data-testid="text-daily-error">{error}</p>}
          {message && (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5" data-testid="text-daily-saved">
              <Check className="h-4 w-4" /> {message}
            </p>
          )}

          <Button onClick={save} disabled={saving} className="w-full sm:w-auto" data-testid="button-save-daily">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save {date}
          </Button>

          {submissionsOpen && (
            <section className="p-4 rounded-xl border border-border/60 bg-card space-y-3" data-testid="admin-daily-submissions">
              <h2 className="font-semibold">Submissions for {date}</h2>
              {!submissions ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Reflections ({submissions.reflections.length})
                    </h3>
                    {submissions.reflections.map((r) => (
                      <div key={r.id} className="py-1.5 border-b border-border/40 last:border-0">
                        <div className="text-[11px] text-muted-foreground">{r.odUserId}</div>
                        <p className="whitespace-pre-wrap">{r.reflectionText}</p>
                      </div>
                    ))}
                    {submissions.reflections.length === 0 && <p className="text-muted-foreground text-xs">None yet</p>}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Question answers ({submissions.questions.length}
                      {submissions.questions.length > 0 && ` · ${submissions.questions.filter(q => q.isCorrect).length} correct`})
                    </h3>
                    {submissions.questions.map((q) => (
                      <div key={q.id} className="py-1 border-b border-border/40 last:border-0 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground truncate">{q.odUserId}</span>
                        <span className={cn("text-xs", q.isCorrect ? "text-emerald-600" : "text-rose-500")}>
                          {q.options?.[q.selectedIndex] ?? q.selectedIndex}
                        </span>
                      </div>
                    ))}
                    {submissions.questions.length === 0 && <p className="text-muted-foreground text-xs">None yet</p>}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Activity answers ({submissions.activities.length}
                      {submissions.activities.length > 0 && ` · ${submissions.activities.filter(a => a.isCorrect).length} correct`})
                    </h3>
                    {submissions.activities.map((a) => (
                      <div key={a.id} className="py-1 border-b border-border/40 last:border-0 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground truncate">{a.odUserId}</span>
                        <span className={cn("text-xs", a.isCorrect ? "text-emerald-600" : "text-rose-500")}>{a.submittedAnswer}</span>
                      </div>
                    ))}
                    {submissions.activities.length === 0 && <p className="text-muted-foreground text-xs">None yet</p>}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
