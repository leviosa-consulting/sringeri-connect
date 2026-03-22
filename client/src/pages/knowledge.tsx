import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { BookOpenCheck, ChevronLeft, ChevronRight, Trophy, Clock, CheckCircle2, XCircle, Play, Image as ImageIcon, Volume2, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface QuizOption {
  text: string;
  isCorrect?: boolean;
}

interface QuizQuestion {
  id: number;
  questionText: string;
  options: QuizOption[];
  correctCount: number;
  sortOrder: number;
}

interface QuizData {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  imageUrls: string[] | null;
  publishDate: string;
  questions: QuizQuestion[];
  attempt: { score: number; totalQuestions: number; answers: Record<string, number[]>; completedAt: string } | null;
}

interface HistoryItem {
  id: number;
  quizId: number;
  score: number;
  totalQuestions: number;
  completedAt: string;
  quizTitle: string;
  quizPublishDate: string;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export default function Knowledge() {
  const { getToken } = useAuth();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"quiz" | "history">("quiz");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalQuestions: number; questions: QuizQuestion[] } | null>(null);
  const [showContent, setShowContent] = useState(true);
  const [showResultContent, setShowResultContent] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const fetchQuiz = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch("/api/quiz/today", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setQuiz(data);
      if (data?.attempt) {
        setSubmitted(true);
        setShowContent(false);
        setAnswers(data.attempt.answers || {});
        setResult({ score: data.attempt.score, totalQuestions: data.attempt.totalQuestions, questions: data.questions });
      }
    } catch (err) {
      console.error("Failed to fetch quiz:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/quiz/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  const handleOptionToggle = (questionId: number, optionIndex: number, correctCount: number) => {
    const key = String(questionId);
    const current = answers[key] || [];
    if (correctCount === 1) {
      setAnswers({ ...answers, [key]: [optionIndex] });
    } else {
      if (current.includes(optionIndex)) {
        setAnswers({ ...answers, [key]: current.filter(i => i !== optionIndex) });
      } else {
        if (current.length < correctCount) {
          setAnswers({ ...answers, [key]: [...current, optionIndex] });
        }
      }
    }
  };

  const isQuestionAnswered = (q: QuizQuestion) => {
    const selected = answers[String(q.id)] || [];
    return selected.length === q.correctCount;
  };

  const allAnswered = quiz?.questions.every(q => isQuestionAnswered(q)) ?? false;

  const handleSubmit = async () => {
    if (!quiz) return;
    try {
      setSubmitting(true);
      const token = await getToken();
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setShowContent(false);
        setResult({ score: data.attempt.score, totalQuestions: data.attempt.totalQuestions, questions: data.questions });
      }
    } catch (err) {
      console.error("Failed to submit quiz:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasQuestions = quiz && quiz.questions.length > 0;
  const hasContent = quiz && (quiz.description || quiz.videoUrl || quiz.audioUrl || (quiz.imageUrls && quiz.imageUrls.length > 0));
  const quizStarted = !showContent || (!hasContent && hasQuestions);

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5" data-testid="knowledge-page">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-bold text-primary flex items-center gap-2" data-testid="text-knowledge-title">
            <BookOpenCheck className="w-6 h-6" />
            Knowledge Corner
          </h1>
          <p className="text-sm text-muted-foreground">Test your knowledge daily</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("quiz")}
          className={cn("flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors", tab === "quiz" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
          data-testid="tab-quiz"
        >
          Today's Quiz
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn("flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5", tab === "history" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
          data-testid="tab-history"
        >
          <History className="w-4 h-4" />
          My Scores
        </button>
      </div>

      {tab === "quiz" && (
        <>
          {!quiz ? (
            <div className="text-center py-16 space-y-3">
              <BookOpenCheck className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <p className="text-muted-foreground font-medium">No quiz available today</p>
              <p className="text-sm text-muted-foreground/70">Check back tomorrow for a new quiz!</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 space-y-1">
                <h2 className="font-serif font-bold text-lg text-foreground" data-testid="text-quiz-title">{quiz.title}</h2>
                {quiz.subtitle && <p className="text-sm text-muted-foreground" data-testid="text-quiz-subtitle">{quiz.subtitle}</p>}
                {hasQuestions && (
                  <p className="text-xs text-primary font-medium mt-1">{quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""}</p>
                )}
              </div>

              {hasContent && showContent && !submitted && (
                <div className="space-y-4 bg-card rounded-xl border border-border/50 p-4">
                  {quiz.description && (
                    <div className="prose prose-sm max-w-none text-foreground" data-testid="text-quiz-description">
                      <ReactMarkdown>{quiz.description}</ReactMarkdown>
                    </div>
                  )}

                  {quiz.videoUrl && (
                    <div className="rounded-lg overflow-hidden" data-testid="quiz-video">
                      {getYouTubeId(quiz.videoUrl) ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(quiz.videoUrl)}`}
                          className="w-full aspect-video"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <video src={quiz.videoUrl} controls className="w-full rounded-lg" />
                      )}
                    </div>
                  )}

                  {quiz.audioUrl && (
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3" data-testid="quiz-audio">
                      <Volume2 className="w-5 h-5 text-primary shrink-0" />
                      <audio src={quiz.audioUrl} controls className="w-full h-8" />
                    </div>
                  )}

                  {quiz.imageUrls && quiz.imageUrls.length > 0 && (
                    <div className="space-y-2" data-testid="quiz-gallery">
                      <div className="relative rounded-lg overflow-hidden bg-muted">
                        <img
                          src={quiz.imageUrls[galleryIndex]}
                          alt={`Image ${galleryIndex + 1}`}
                          className="w-full max-h-[300px] object-contain mx-auto"
                        />
                        {quiz.imageUrls.length > 1 && (
                          <>
                            <button
                              onClick={() => setGalleryIndex(i => (i - 1 + quiz.imageUrls!.length) % quiz.imageUrls!.length)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setGalleryIndex(i => (i + 1) % quiz.imageUrls!.length)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                              {quiz.imageUrls.map((_, i) => (
                                <div key={i} className={cn("w-2 h-2 rounded-full", i === galleryIndex ? "bg-white" : "bg-white/50")} />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {hasQuestions && (
                    <Button
                      onClick={() => setShowContent(false)}
                      className="w-full bg-primary hover:bg-primary/90"
                      data-testid="button-start-quiz"
                    >
                      Start Quiz
                    </Button>
                  )}
                </div>
              )}

              {hasQuestions && quizStarted && !submitted && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">
                      Question {currentQuestion + 1} of {quiz.questions.length}
                    </span>
                    <div className="flex gap-1">
                      {quiz.questions.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full transition-colors",
                            i === currentQuestion ? "bg-primary" :
                            isQuestionAnswered(quiz.questions[i]) ? "bg-green-500" : "bg-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <QuestionCard
                    question={quiz.questions[currentQuestion]}
                    selected={answers[String(quiz.questions[currentQuestion].id)] || []}
                    onToggle={(optIdx) => handleOptionToggle(quiz.questions[currentQuestion].id, optIdx, quiz.questions[currentQuestion].correctCount)}
                    submitted={false}
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentQuestion > 0) {
                          setCurrentQuestion(c => c - 1);
                        } else if (hasContent) {
                          setShowContent(true);
                        }
                      }}
                      disabled={currentQuestion === 0 && !hasContent}
                      className="flex-1"
                      data-testid="button-prev-question"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {currentQuestion === 0 && hasContent ? "Content" : "Back"}
                    </Button>

                    {currentQuestion < quiz.questions.length - 1 ? (
                      <Button
                        onClick={() => setCurrentQuestion(c => c + 1)}
                        disabled={!isQuestionAnswered(quiz.questions[currentQuestion])}
                        className="flex-1 bg-primary hover:bg-primary/90"
                        data-testid="button-next-question"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : allAnswered ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-submit-quiz"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        Submit
                      </Button>
                    ) : null}
                  </div>

                </div>
              )}

              {submitted && result && (
                <div className="space-y-5">
                  <div className={cn(
                    "rounded-xl p-6 text-center space-y-3",
                    result.score === result.totalQuestions ? "bg-green-50 border border-green-200" :
                    result.score >= result.totalQuestions / 2 ? "bg-amber-50 border border-amber-200" :
                    "bg-red-50 border border-red-200"
                  )}>
                    <Trophy className={cn(
                      "w-12 h-12 mx-auto",
                      result.score === result.totalQuestions ? "text-green-500" :
                      result.score >= result.totalQuestions / 2 ? "text-amber-500" : "text-red-400"
                    )} />
                    <div className="text-3xl font-bold font-serif" data-testid="text-quiz-score">
                      {result.score}/{result.totalQuestions}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.score === result.totalQuestions ? "Perfect score! Outstanding!" :
                       result.score >= result.totalQuestions / 2 ? "Good effort! Keep learning!" :
                       "Keep trying! You'll do better next time!"}
                    </p>
                  </div>

                  {hasContent && (
                    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                      <button
                        onClick={() => setShowResultContent(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-muted/50 transition-colors"
                        data-testid="button-toggle-content"
                      >
                        <span className="flex items-center gap-2">
                          <BookOpenCheck className="w-4 h-4" />
                          {showResultContent ? "Hide Content" : "Read Content"}
                        </span>
                        <ChevronRight className={cn("w-4 h-4 transition-transform", showResultContent && "rotate-90")} />
                      </button>
                      {showResultContent && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
                          {quiz.description && (
                            <div className="prose prose-sm max-w-none text-foreground">
                              <ReactMarkdown>{quiz.description}</ReactMarkdown>
                            </div>
                          )}
                          {quiz.videoUrl && (
                            <div className="rounded-lg overflow-hidden">
                              {getYouTubeId(quiz.videoUrl) ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${getYouTubeId(quiz.videoUrl)}`}
                                  className="w-full aspect-video"
                                  allowFullScreen
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                              ) : (
                                <video src={quiz.videoUrl} controls className="w-full rounded-lg" />
                              )}
                            </div>
                          )}
                          {quiz.audioUrl && (
                            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                              <Volume2 className="w-5 h-5 text-primary shrink-0" />
                              <audio src={quiz.audioUrl} controls className="w-full h-8" />
                            </div>
                          )}
                          {quiz.imageUrls && quiz.imageUrls.length > 0 && (
                            <div className="rounded-lg overflow-hidden bg-muted">
                              <img
                                src={quiz.imageUrls[galleryIndex]}
                                alt={`Image ${galleryIndex + 1}`}
                                className="w-full max-h-[300px] object-contain mx-auto"
                              />
                              {quiz.imageUrls.length > 1 && (
                                <div className="flex justify-center gap-1 py-2">
                                  {quiz.imageUrls.map((_, i) => (
                                    <button key={i} onClick={() => setGalleryIndex(i)} className={cn("w-2 h-2 rounded-full", i === galleryIndex ? "bg-primary" : "bg-muted-foreground/30")} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="font-serif font-bold text-base">Review Answers</h3>
                    {result.questions.map((q, qIdx) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        selected={answers[String(q.id)] || []}
                        onToggle={() => {}}
                        submitted={true}
                        questionNumber={qIdx + 1}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {historyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <p className="text-muted-foreground font-medium">No quizzes taken yet</p>
              <p className="text-sm text-muted-foreground/70">Complete today's quiz to see your scores here</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-xl border border-border/50 p-4 flex items-center justify-between"
                data-testid={`history-item-${item.id}`}
              >
                <div className="space-y-0.5">
                  <h3 className="font-serif font-semibold text-sm">{item.quizTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.quizPublishDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className={cn(
                  "text-lg font-bold font-serif px-3 py-1 rounded-lg",
                  item.score === item.totalQuestions ? "bg-green-100 text-green-700" :
                  item.score >= item.totalQuestions / 2 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-600"
                )}>
                  {item.score}/{item.totalQuestions}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, selected, onToggle, submitted, questionNumber }: {
  question: QuizQuestion;
  selected: number[];
  onToggle: (optionIndex: number) => void;
  submitted: boolean;
  questionNumber?: number;
}) {
  const isSingle = question.correctCount === 1;

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3" data-testid={`question-card-${question.id}`}>
      <div className="space-y-1">
        {questionNumber && <span className="text-xs font-semibold text-primary">Question {questionNumber}</span>}
        <p className="font-medium text-sm leading-relaxed">{question.questionText}</p>
        {!submitted && question.correctCount > 1 && (
          <p className="text-xs text-primary/80 font-medium">Select {question.correctCount} answers</p>
        )}
      </div>

      <div className="space-y-2">
        {(question.options as QuizOption[]).map((opt, i) => {
          const isSelected = selected.includes(i);
          const isCorrect = submitted && opt.isCorrect;
          const isWrong = submitted && isSelected && !opt.isCorrect;

          return (
            <button
              key={i}
              onClick={() => !submitted && onToggle(i)}
              disabled={submitted || (!isSelected && !isSingle && selected.length >= question.correctCount)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm flex items-center gap-3",
                submitted ? (
                  isCorrect ? "border-green-500 bg-green-50" :
                  isWrong ? "border-red-500 bg-red-50" :
                  "border-border bg-background"
                ) : (
                  isSelected ? "border-primary bg-primary/5" :
                  "border-border hover:border-primary/40 bg-background"
                )
              )}
              data-testid={`option-${question.id}-${i}`}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                isSingle ? "" : "rounded",
                submitted ? (
                  isCorrect ? "border-green-500 bg-green-500" :
                  isWrong ? "border-red-500 bg-red-500" :
                  "border-muted-foreground/30"
                ) : (
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                )
              )}>
                {(isSelected || (submitted && isCorrect)) && (
                  submitted ? (
                    isCorrect ? <CheckCircle2 className="w-3 h-3 text-white" /> :
                    isWrong ? <XCircle className="w-3 h-3 text-white" /> : null
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )
                )}
              </div>
              <span className={cn(
                submitted && isCorrect && "font-medium text-green-700",
                submitted && isWrong && "font-medium text-red-600"
              )}>
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
