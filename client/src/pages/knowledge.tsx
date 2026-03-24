import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useParams, useLocation } from "wouter";
import { BookOpenCheck, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Trophy, Clock, CheckCircle2, XCircle, Play, Image as ImageIcon, Volume2, History, Loader2, Share2, Check, Library, Flame, Lock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedAt: string | null;
  progress: number;
  target: number;
}

interface GamificationData {
  currentStreak: number;
  totalAttempted: number;
  badges: BadgeData[];
}

const markdownComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
};

function ImageGallery({ images, testId }: { images: string[]; testId?: string }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const minSwipe = 50;

  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setIndex(i => (i + 1) % images.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (Math.abs(distance) >= minSwipe) {
      if (distance > 0) next();
      else prev();
    }
    touchStart.current = null;
    touchEnd.current = null;
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <div
        className="relative rounded-lg overflow-hidden bg-muted"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={images[index]}
          alt={`Image ${index + 1}`}
          className="w-full max-h-[300px] object-contain mx-auto"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <div key={i} className={cn("w-2 h-2 rounded-full", i === index ? "bg-white" : "bg-white/50")} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
  groupName?: string | null;
  episodeNumber?: number | null;
  locked?: boolean;
  lockReason?: string;
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

interface PastQuizItem {
  id: number;
  title: string;
  subtitle: string | null;
  publishDate: string;
  questionCount: number;
  attempted: boolean;
  score: number | null;
  totalQuestions: number | null;
  groupName?: string | null;
  episodeNumber?: number | null;
  locked?: boolean;
  lockReason?: string | null;
}

interface UpcomingQuizItem {
  id: number;
  title: string;
  subtitle: string | null;
  publishDate: string;
  groupName?: string | null;
  episodeNumber?: number | null;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export default function Knowledge() {
  const { getToken } = useAuth();
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const permalinkId = params.id ? Number(params.id) : null;
  const [selectedPastQuizId, setSelectedPastQuizId] = useState<number | null>(null);
  const activeQuizId = selectedPastQuizId || permalinkId;
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"quiz" | "history" | "past">("quiz");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pastQuizzes, setPastQuizzes] = useState<PastQuizItem[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<UpcomingQuizItem[]>([]);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalQuestions: number; questions: QuizQuestion[] } | null>(null);
  const [showContent, setShowContent] = useState(true);
  const [showResultContent, setShowResultContent] = useState(false);
  const [reviewQuiz, setReviewQuiz] = useState<QuizData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const fetchGamification = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/quiz/gamification", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGamification(data);
      }
    } catch (err) {
      console.error("Failed to fetch gamification:", err);
    }
  }, [getToken]);

  const fetchQuiz = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const url = activeQuizId ? `/api/quiz/by-id/${activeQuizId}` : "/api/quiz/today";
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setQuiz(null); return; }
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
  }, [getToken, activeQuizId]);

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

  const fetchPastQuizzes = useCallback(async () => {
    try {
      setPastLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/quiz/past", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPastQuizzes(data);
    } catch (err) {
      console.error("Failed to fetch past quizzes:", err);
    } finally {
      setPastLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setShowContent(true);
    setShowResultContent(false);
    setReviewQuiz(null);
    setNewBadges([]);
    setShowCelebration(false);
    fetchQuiz();
    fetchGamification();
    fetch("/api/quiz/upcoming")
      .then(r => r.ok ? r.json() : [])
      .then(data => setUpcomingQuizzes(data))
      .catch(() => {});
  }, [fetchQuiz, fetchGamification]);

  useEffect(() => {
    if (tab === "history") { fetchHistory(); fetchGamification(); }
    if (tab === "past") fetchPastQuizzes();
  }, [tab, fetchHistory, fetchPastQuizzes, fetchGamification]);

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
        if (data.newBadges && data.newBadges.length > 0) {
          setNewBadges(data.newBadges);
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 5000);
        }
        fetchGamification();
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
          <h1 className="text-xl font-serif font-bold text-primary flex items-center gap-2" data-testid="text-knowledge-title">
            <BookOpenCheck className="w-5 h-5" />
            Knowledge Corner
          </h1>
          <p className="text-xs text-muted-foreground">Test your knowledge daily</p>
        </div>
        {gamification && gamification.currentStreak > 0 && (
          <div className="flex items-center gap-1 bg-gradient-to-r from-orange-100 to-amber-50 px-2.5 py-1 rounded-full border border-orange-200" data-testid="streak-counter">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-bold text-orange-600">{gamification.currentStreak}</span>
            <span className="text-xs text-orange-500 font-medium">day{gamification.currentStreak !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setSelectedPastQuizId(null); setTab("quiz"); }}
          className={cn("flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors", tab === "quiz" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
          data-testid="tab-quiz"
        >
          {activeQuizId ? "Quiz" : "Today's Quiz"}
        </button>
        <button
          onClick={() => setTab("past")}
          className={cn("flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1", tab === "past" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
          data-testid="tab-past"
        >
          <Library className="w-3.5 h-3.5" />
          Past Quizzes
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn("flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1", tab === "history" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
          data-testid="tab-history"
        >
          <History className="w-3.5 h-3.5" />
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
          ) : quiz.locked ? (
            <div className="space-y-5">
              {selectedPastQuizId && (
                <button
                  onClick={() => { setSelectedPastQuizId(null); setTab("past"); }}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                  data-testid="button-back-to-past"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Past Quizzes
                </button>
              )}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 space-y-2">
                {quiz.groupName && (
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider">{quiz.groupName}{quiz.episodeNumber ? ` — Episode ${quiz.episodeNumber}` : ""}</p>
                )}
                <h2 className="font-serif font-bold text-lg text-foreground" data-testid="text-quiz-title">{quiz.title}</h2>
                {quiz.subtitle && <p className="text-sm text-muted-foreground">{quiz.subtitle}</p>}
              </div>
              <div className="text-center py-10 space-y-3 bg-card rounded-xl border border-border/50 p-6" data-testid="quiz-locked">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-7 h-7 text-orange-500" />
                </div>
                <p className="font-medium text-foreground">This episode is locked</p>
                <p className="text-sm text-muted-foreground">{quiz.lockReason}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {selectedPastQuizId && (
                <button
                  onClick={() => { setSelectedPastQuizId(null); setTab("past"); }}
                  className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                  data-testid="button-back-to-past"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Past Quizzes
                </button>
              )}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    {quiz.groupName && (
                      <p className="text-xs text-primary font-semibold uppercase tracking-wider">{quiz.groupName}{quiz.episodeNumber ? ` — Episode ${quiz.episodeNumber}` : ""}</p>
                    )}
                    <h2 className="font-serif font-bold text-lg text-foreground" data-testid="text-quiz-title">{quiz.title}</h2>
                    {quiz.subtitle && <p className="text-sm text-muted-foreground" data-testid="text-quiz-subtitle">{quiz.subtitle}</p>}
                    {hasQuestions && (
                      <p className="text-xs text-primary font-medium mt-1">{quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/knowledge/${quiz.id}`;
                      if (navigator.share) {
                        navigator.share({ title: quiz.title, text: quiz.subtitle || "Take this quiz!", url: shareUrl });
                      } else {
                        navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="shrink-0 p-2 rounded-full hover:bg-primary/10 transition-colors text-primary"
                    data-testid="button-share-quiz"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {hasContent && showContent && !submitted && (
                <div className="space-y-4 bg-card rounded-xl border border-border/50 p-4">
                  {quiz.description && (
                    <div className="quiz-content" data-testid="text-quiz-description">
                      <ReactMarkdown components={markdownComponents}>{quiz.description}</ReactMarkdown>
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
                    <ImageGallery images={quiz.imageUrls} testId="quiz-gallery" />
                  )}

                </div>
              )}

              {hasContent && showContent && !submitted && hasQuestions && (
                <Button
                  onClick={() => setShowContent(false)}
                  className="w-full bg-primary hover:bg-primary/90 text-lg py-6 font-bold shadow-lg"
                  data-testid="button-start-quiz"
                >
                  Start Quiz
                </Button>
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

                  {newBadges.length > 0 && showCelebration && gamification && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 space-y-3" data-testid="new-badges-celebration">
                      <p className="text-sm font-bold text-amber-700 text-center">New Badge{newBadges.length > 1 ? "s" : ""} Earned!</p>
                      <div className="flex justify-center gap-3 flex-wrap">
                        {newBadges.map(badgeId => {
                          const badge = gamification.badges.find(b => b.id === badgeId);
                          if (!badge) return null;
                          return (
                            <div key={badgeId} className="flex flex-col items-center gap-1 animate-bounce" data-testid={`new-badge-${badgeId}`}>
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg ring-2 ring-amber-300">
                                {badge.emoji}
                              </div>
                              <span className="text-xs font-semibold text-amber-700">{badge.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                            <div className="quiz-content">
                              <ReactMarkdown components={markdownComponents}>{quiz.description}</ReactMarkdown>
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
                            <ImageGallery images={quiz.imageUrls} />
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

      {tab === "past" && (
        <div className="space-y-4">
          {upcomingQuizzes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Upcoming
              </h3>
              {upcomingQuizzes.map((uq) => (
                <div
                  key={uq.id}
                  className="bg-muted/50 rounded-xl border border-border/30 p-4 flex items-center justify-between opacity-70"
                  data-testid={`upcoming-quiz-${uq.id}`}
                >
                  <div className="space-y-0.5 flex-1">
                    {uq.groupName && (
                      <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">{uq.groupName}{uq.episodeNumber ? ` — Ep. ${uq.episodeNumber}` : ""}</p>
                    )}
                    <h3 className="font-serif font-semibold text-sm text-foreground">{uq.title}</h3>
                    {uq.subtitle && <p className="text-xs text-muted-foreground">{uq.subtitle}</p>}
                  </div>
                  <div className="shrink-0 ml-3 text-xs text-muted-foreground font-medium">
                    {new Date(uq.publishDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pastLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : pastQuizzes.length === 0 ? (
            !upcomingQuizzes.length && (
              <div className="text-center py-16 space-y-3">
                <Library className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground font-medium">No quizzes yet</p>
                <p className="text-sm text-muted-foreground/70">Check back after more quizzes are published!</p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setPastExpanded(!pastExpanded)}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-foreground"
                data-testid="button-toggle-past"
              >
                <span className="flex items-center gap-2">
                  <Library className="w-4 h-4 text-primary" />
                  More Quizzes ({pastQuizzes.length})
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", pastExpanded && "rotate-180")} />
              </button>
              {pastExpanded && (
                <div className="space-y-3">
                  {pastQuizzes.map((pq) => (
                    <button
                      key={pq.id}
                      onClick={() => {
                        if (pq.locked) return;
                        setSelectedPastQuizId(pq.id);
                        setTab("quiz");
                      }}
                      className={cn(
                        "w-full bg-card rounded-xl border border-border/50 p-4 flex items-center justify-between text-left transition-colors",
                        pq.locked ? "opacity-60 cursor-not-allowed" : "hover:border-primary/30"
                      )}
                      data-testid={`past-quiz-${pq.id}`}
                      disabled={!!pq.locked}
                    >
                      <div className="space-y-0.5 flex-1">
                        {pq.groupName && (
                          <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">{pq.groupName}{pq.episodeNumber ? ` — Ep. ${pq.episodeNumber}` : ""}</p>
                        )}
                        <h3 className="font-serif font-semibold text-sm">{pq.title}</h3>
                        {pq.subtitle && <p className="text-xs text-muted-foreground">{pq.subtitle}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground/70 mt-1">
                          <span>{new Date(pq.publishDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {pq.questionCount > 0 && <span>{pq.questionCount} question{pq.questionCount > 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                        {pq.locked ? (
                          <Lock className="w-5 h-5 text-muted-foreground/50" />
                        ) : pq.attempted ? (
                          <div className={cn(
                            "text-center px-3 py-1.5 rounded-lg text-xs font-bold",
                            pq.score === pq.totalQuestions ? "bg-green-50 text-green-600" :
                            (pq.score ?? 0) >= (pq.totalQuestions ?? 1) / 2 ? "bg-amber-50 text-amber-600" :
                            "bg-red-50 text-red-500"
                          )}>
                            {pq.score}/{pq.totalQuestions}
                          </div>
                        ) : (
                          <div className="text-xs text-primary font-semibold px-3 py-1.5 rounded-lg bg-primary/10">
                            Take Quiz
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {reviewQuiz ? (
            <HistoryReview
              quiz={reviewQuiz}
              onBack={() => { setReviewQuiz(null); setShowResultContent(false); }}
              showResultContent={showResultContent}
              setShowResultContent={setShowResultContent}
            />
          ) : historyLoading ? (
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
            <>
              {(() => {
                const totalScore = history.reduce((s, h) => s + h.score, 0);
                const totalQuestions = history.reduce((s, h) => s + h.totalQuestions, 0);
                const perfectCount = history.filter(h => h.score === h.totalQuestions).length;
                const streak = gamification?.currentStreak ?? 0;
                const earnedBadges = gamification?.badges.filter(b => b.earned).length ?? 0;
                return (
                  <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm" data-testid="total-score-card">
                    <div className="bg-gradient-to-br from-primary via-orange-500 to-amber-500 p-6 text-white text-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)", backgroundSize: "60px 60px, 40px 40px, 50px 50px" }} />
                      <div className="relative">
                        <p className="text-sm font-medium text-white/70 uppercase tracking-widest mb-1">Total Points</p>
                        <p className="text-5xl font-bold font-serif tracking-tight">{totalScore}</p>
                        <p className="text-sm text-white/70 mt-1">out of {totalQuestions}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-border/30 bg-card">
                      <div className="py-3 text-center">
                        <p className="text-base font-bold font-serif text-foreground">{history.length}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Played</p>
                      </div>
                      <div className="py-3 text-center">
                        <p className="text-base font-bold font-serif text-green-600">{perfectCount}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Perfect</p>
                      </div>
                      <div className="py-3 text-center">
                        <p className="text-base font-bold font-serif text-orange-500">{streak}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Streak</p>
                      </div>
                      <div className="py-3 text-center">
                        <p className="text-base font-bold font-serif text-amber-500">{earnedBadges}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Badges</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {gamification && gamification.badges.length > 0 && (() => {
                const earned = gamification.badges.filter(b => b.earned);
                const unearned = gamification.badges.filter(b => !b.earned);
                return (
                  <div className="space-y-5" data-testid="badges-section">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-serif font-bold text-foreground flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                          <Trophy className="w-4.5 h-4.5 text-white" />
                        </div>
                        Badges
                      </h3>
                      <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-full">
                        {earned.length} of {gamification.badges.length}
                      </span>
                    </div>

                    {earned.length > 0 && (
                      <div className="space-y-3">
                        {earned.map(badge => (
                          <div
                            key={badge.id}
                            className="flex items-center gap-4 bg-gradient-to-r from-amber-50 via-orange-50/80 to-yellow-50/60 rounded-2xl border border-amber-200/70 p-4 shadow-sm"
                            data-testid={`badge-${badge.id}`}
                          >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-200/50 ring-2 ring-amber-300/30 shrink-0">
                              {badge.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-amber-900">{badge.name}</p>
                              <p className="text-xs text-amber-700/80 mt-0.5">{badge.description}</p>
                              {badge.earnedAt && (
                                <p className="text-[10px] text-amber-600/70 mt-1.5 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Earned {new Date(badge.earnedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {unearned.length > 0 && (
                      <div className="space-y-2.5">
                        {earned.length > 0 && (
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Up Next</p>
                        )}
                        {unearned.map(badge => (
                          <div
                            key={badge.id}
                            className="flex items-center gap-3.5 bg-card rounded-xl border border-border/50 p-3.5"
                            data-testid={`badge-${badge.id}`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center text-xl shrink-0 opacity-40">
                              {badge.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-muted-foreground">{badge.name}</p>
                              <p className="text-[10px] text-muted-foreground/70 leading-snug mt-0.5">{badge.description}</p>
                              {badge.target > 1 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.max(Math.round((badge.progress / badge.target) * 100), badge.progress > 0 ? 6 : 0)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">{badge.progress}/{badge.target}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryReview({ quiz, onBack, showResultContent, setShowResultContent }: {
  quiz: QuizData;
  onBack: () => void;
  showResultContent: boolean;
  setShowResultContent: (v: boolean) => void;
}) {
  const hasContent = quiz.description || quiz.videoUrl || quiz.audioUrl || (quiz.imageUrls && quiz.imageUrls.length > 0);

  return (
    <div className="space-y-5" data-testid="history-review">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-history">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-serif font-bold text-base">{quiz.title}</h2>
          {quiz.subtitle && <p className="text-xs text-muted-foreground">{quiz.subtitle}</p>}
        </div>
      </div>

      {quiz.attempt && (
        <div className={cn(
          "rounded-xl p-4 text-center space-y-1",
          quiz.attempt.score === quiz.attempt.totalQuestions ? "bg-green-50 border border-green-200" :
          quiz.attempt.score >= quiz.attempt.totalQuestions / 2 ? "bg-amber-50 border border-amber-200" :
          "bg-red-50 border border-red-200"
        )}>
          <Trophy className={cn(
            "w-8 h-8 mx-auto",
            quiz.attempt.score === quiz.attempt.totalQuestions ? "text-green-500" :
            quiz.attempt.score >= quiz.attempt.totalQuestions / 2 ? "text-amber-500" : "text-red-400"
          )} />
          <div className="text-2xl font-bold font-serif">{quiz.attempt.score}/{quiz.attempt.totalQuestions}</div>
        </div>
      )}

      {hasContent && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <button
            onClick={() => setShowResultContent(!showResultContent)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-muted/50 transition-colors"
            data-testid="button-toggle-review-content"
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
                <div className="quiz-content">
                  <ReactMarkdown components={markdownComponents}>{quiz.description}</ReactMarkdown>
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
                <ImageGallery images={quiz.imageUrls} />
              )}
            </div>
          )}
        </div>
      )}

      {quiz.attempt && (
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base">Review Answers</h3>
          {quiz.questions.map((q, qIdx) => (
            <QuestionCard
              key={q.id}
              question={q}
              selected={(quiz.attempt!.answers[String(q.id)] || [])}
              onToggle={() => {}}
              submitted={true}
              questionNumber={qIdx + 1}
            />
          ))}
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
        <p className="font-semibold text-base leading-relaxed">{question.questionText}</p>
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
