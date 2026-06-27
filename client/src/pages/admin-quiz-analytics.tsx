import { useState, useEffect, useCallback } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, ArrowLeft, Users, Target, Trophy, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";


interface Summary {
  totalAttempts: number;
  uniqueUsers: number;
  avgScore: number;
  perfectScores: number;
}

interface PerQuiz {
  quizId: number;
  title: string;
  publishDate: string;
  attempts: number;
  avgScore: number;
  perfectScores: number;
}

interface Attempt {
  id: number;
  odUserId: string;
  quizTitle: string;
  quizPublishDate: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

async function authFetch(url: string, getToken: () => Promise<string | null>) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function AdminQuizAnalytics() {
  const { user, loading: authLoading, getToken, hasAdminRole } = useAuth();
  const isAdmin = hasAdminRole("quiz");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [perQuiz, setPerQuiz] = useState<PerQuiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [attemptsPage, setAttemptsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const attemptsLimit = 25;

  const loadData = useCallback(async () => {
    if (!isAdmin || !getToken) return;
    setLoading(true);
    try {
      const [s, pq] = await Promise.all([
        authFetch("/api/admin/quiz-analytics/summary", getToken),
        authFetch("/api/admin/quiz-analytics/per-quiz", getToken),
      ]);
      setSummary(s);
      setPerQuiz(pq);
    } catch (err) {
      console.error("Failed to load quiz analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, getToken]);

  const loadAttempts = useCallback(async () => {
    if (!isAdmin || !getToken) return;
    try {
      const data = await authFetch(`/api/admin/quiz-analytics/attempts?page=${attemptsPage}&limit=${attemptsLimit}`, getToken);
      setAttempts(data.attempts);
      setAttemptsTotal(data.total);
    } catch (err) {
      console.error("Failed to load attempts:", err);
    }
  }, [isAdmin, getToken, attemptsPage]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadAttempts(); }, [loadAttempts]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RangoliLoader size={64} data-testid="loading-spinner" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2" data-testid="text-access-denied">
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground/60">This page is only for authorized administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RangoliLoader size={64} data-testid="loading-spinner" />
      </div>
    );
  }

  const totalPages = Math.ceil(attemptsTotal / attemptsLimit);

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-6 max-w-4xl mx-auto" data-testid="admin-quiz-analytics-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quiz Analytics</h1>
          <p className="text-sm text-muted-foreground">Knowledge Corner participation and scores</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Hash} label="Total Attempts" value={summary.totalAttempts} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Users} label="Unique Users" value={summary.uniqueUsers} color="bg-green-50 text-green-600" />
          <StatCard icon={Target} label="Avg Score" value={`${summary.avgScore}%`} color="bg-orange-50 text-orange-600" />
          <StatCard icon={Trophy} label="Perfect Scores" value={summary.perfectScores} color="bg-purple-50 text-purple-600" />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Per-Quiz Breakdown</h2>
        {perQuiz.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-quizzes">No quizzes found.</p>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-per-quiz">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quiz</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Attempts</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Score</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Perfect</th>
                  </tr>
                </thead>
                <tbody>
                  {perQuiz.map((q) => (
                    <tr key={q.quizId} className="border-b last:border-0 hover:bg-muted/10" data-testid={`row-quiz-${q.quizId}`}>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{q.title}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{q.publishDate}</td>
                      <td className="px-4 py-3 text-right text-foreground">{q.attempts}</td>
                      <td className="px-4 py-3 text-right text-foreground">{q.avgScore}%</td>
                      <td className="px-4 py-3 text-right text-foreground">{q.perfectScores}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Individual Attempts</h2>
          <span className="text-xs text-muted-foreground">{attemptsTotal} total</span>
        </div>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-attempts">No attempts found.</p>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-attempts">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quiz</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/10" data-testid={`row-attempt-${a.id}`}>
                      <td className="px-4 py-3 text-foreground font-mono text-xs max-w-[120px] truncate">{a.odUserId}</td>
                      <td className="px-4 py-3 text-foreground max-w-[180px] truncate">{a.quizTitle}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${a.score === a.totalQuestions ? 'text-green-600' : 'text-foreground'}`}>
                          {a.score}/{a.totalQuestions}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {new Date(a.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttemptsPage(p => Math.max(1, p - 1))}
                  disabled={attemptsPage <= 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                  Page {attemptsPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttemptsPage(p => Math.min(totalPages, p + 1))}
                  disabled={attemptsPage >= totalPages}
                  data-testid="button-next-page"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 space-y-2" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className={`inline-flex p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
