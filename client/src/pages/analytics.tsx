import { useState, useEffect, useMemo, useCallback } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart3, Eye, Clock, ArrowDown, Users, Activity, RefreshCw, Loader2, ShieldX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";


function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDateRange(period: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (period === "7d") from.setDate(to.getDate() - 7);
  else if (period === "30d") from.setDate(to.getDate() - 30);
  else if (period === "90d") from.setDate(to.getDate() - 90);
  else from.setDate(to.getDate() - 7);
  return { from: formatDate(from), to: formatDate(to) };
}

async function fetchAnalytics(url: string, idToken: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function Analytics() {
  const { user, loading: authLoading, getToken, hasAdminRole } = useAuth();
  const [period, setPeriod] = useState("7d");
  const [pageFilter, setPageFilter] = useState("all");
  const [pageStats, setPageStats] = useState<any[]>([]);
  const [topElements, setTopElements] = useState<any[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = hasAdminRole("analytics");
  const { from, to } = useMemo(() => getDateRange(period), [period]);

  const totals = useMemo(() => {
    const t = { views: 0, users: 0, avgTime: 0, avgScroll: 0 };
    if (pageStats.length === 0) return t;
    t.views = pageStats.reduce((s, p) => s + (p.views || 0), 0);
    t.users = pageStats.reduce((s, p) => s + (p.uniqueUsers || 0), 0);
    const timePages = pageStats.filter((p: any) => p.avgTimeSpent > 0);
    t.avgTime = timePages.length > 0 ? Math.round(timePages.reduce((s: number, p: any) => s + p.avgTimeSpent, 0) / timePages.length) : 0;
    const scrollPages = pageStats.filter((p: any) => p.avgScrollDepth > 0);
    t.avgScroll = scrollPages.length > 0 ? Math.round(scrollPages.reduce((s: number, p: any) => s + p.avgScrollDepth, 0) / scrollPages.length) : 0;
    return t;
  }, [pageStats]);

  const dailyChartData = useMemo(() => {
    const grouped = new Map<string, number>();
    dailySummary.forEach((s: any) => {
      const d = s.date;
      grouped.set(d, (grouped.get(d) || 0) + s.totalPageViews);
    });
    return Array.from(grouped.entries())
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dailySummary]);

  const availablePages = useMemo(() => {
    return pageStats.map((p: any) => p.page);
  }, [pageStats]);

  const loadData = useCallback(async () => {
    if (!user || !isAdmin || !getToken) return;
    setLoading(true);
    setError("");
    try {
      const idToken = await getToken();
      if (!idToken) throw new Error("Failed to get auth token");
      const pageParam = pageFilter !== "all" ? `&page=${encodeURIComponent(pageFilter)}` : "";
      const [stats, elements, live, summary] = await Promise.all([
        fetchAnalytics(`/api/analytics/page-stats?from=${from}&to=${to}`, idToken),
        fetchAnalytics(`/api/analytics/top-elements?from=${from}&to=${to}${pageParam}&limit=15`, idToken),
        fetchAnalytics(`/api/analytics/live`, idToken),
        fetchAnalytics(`/api/analytics/summary?from=${from}&to=${to}${pageParam}`, idToken),
      ]);
      setPageStats(stats);
      setTopElements(elements);
      setLiveCount(live.activeSessions);
      setDailySummary(summary);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, getToken, from, to, pageFilter]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RangoliLoader size={64} data-testid="analytics-loading" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" data-testid="analytics-denied">
        <ShieldX className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 max-w-6xl mx-auto" data-testid="analytics-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="analytics-title">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">User activity tracking dashboard</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} data-testid="button-refresh">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={period} onValueChange={setPeriod} data-testid="select-period">
          <SelectTrigger className="w-[140px]" data-testid="select-period-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d" data-testid="option-7d">Last 7 days</SelectItem>
            <SelectItem value="30d" data-testid="option-30d">Last 30 days</SelectItem>
            <SelectItem value="90d" data-testid="option-90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={pageFilter} onValueChange={setPageFilter} data-testid="select-page">
          <SelectTrigger className="w-[160px]" data-testid="select-page-trigger">
            <SelectValue placeholder="All pages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-all-pages">All pages</SelectItem>
            {availablePages.map((p: string) => (
              <SelectItem key={p} value={p} data-testid={`option-page-${p}`}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-6" data-testid="analytics-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card data-testid="card-total-views">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Eye className="h-3.5 w-3.5" /> Page Views
            </div>
            <div className="text-2xl font-bold">{totals.views.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-unique-users">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Unique Users
            </div>
            <div className="text-2xl font-bold">{totals.users.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-avg-time">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" /> Avg Time
            </div>
            <div className="text-2xl font-bold">{totals.avgTime}s</div>
          </CardContent>
        </Card>
        <Card data-testid="card-avg-scroll">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ArrowDown className="h-3.5 w-3.5" /> Avg Scroll
            </div>
            <div className="text-2xl font-bold">{totals.avgScroll}%</div>
          </CardContent>
        </Card>
        <Card data-testid="card-live-sessions">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Activity className="h-3.5 w-3.5" /> Live Sessions
            </div>
            <div className="text-2xl font-bold text-green-600">{liveCount}</div>
          </CardContent>
        </Card>
      </div>

      {dailyChartData.length > 0 && (
        <Card className="mb-6" data-testid="card-daily-trend">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Page Views</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(d: string) => d} />
                <Line type="monotone" dataKey="views" stroke="#FF6600" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card data-testid="card-page-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Page Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pageStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data for selected period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 font-medium">Page</th>
                      <th className="py-2 font-medium text-right">Views</th>
                      <th className="py-2 font-medium text-right">Users</th>
                      <th className="py-2 font-medium text-right">Time</th>
                      <th className="py-2 font-medium text-right">Scroll</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageStats.map((p: any) => (
                      <tr key={p.page} className="border-b last:border-0" data-testid={`row-page-${p.page}`}>
                        <td className="py-2 font-mono text-xs">{p.page}</td>
                        <td className="py-2 text-right">{p.views}</td>
                        <td className="py-2 text-right">{p.uniqueUsers}</td>
                        <td className="py-2 text-right">{p.avgTimeSpent}s</td>
                        <td className="py-2 text-right">{p.avgScrollDepth}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-top-elements">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Clicked Elements</CardTitle>
          </CardHeader>
          <CardContent>
            {topElements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No click data for selected period</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.min(topElements.length * 32 + 20, 300)}>
                  <BarChart data={topElements.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="elementText"
                      tick={{ fontSize: 10 }}
                      width={120}
                      tickFormatter={(t: string) => t.length > 20 ? t.slice(0, 18) + "…" : t}
                    />
                    <Tooltip />
                    <Bar dataKey="clickCount" fill="#FF6600" radius={[0, 4, 4, 0]} name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                  {topElements.map((el: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0" data-testid={`row-element-${i}`}>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-muted-foreground">{el.elementId}</span>
                        {el.elementText && <span className="ml-2 text-foreground truncate">{el.elementText}</span>}
                      </div>
                      <span className="font-medium ml-2 flex-shrink-0">{el.clickCount} clicks</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6" data-testid="card-aggregate">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Manual Aggregation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Run daily aggregation to pre-compute summary stats for faster loading.
          </p>
          <AggregateButton getToken={getToken} />
        </CardContent>
      </Card>
    </div>
  );
}

function AggregateButton({ getToken }: { getToken: () => Promise<string | null> }) {
  const [aggregating, setAggregating] = useState(false);
  const [result, setResult] = useState("");

  async function handleAggregate() {
    setAggregating(true);
    setResult("");
    try {
      const idToken = await getToken();
      if (!idToken) throw new Error("No auth token");
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const res = await fetch("/api/analytics/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ date: yesterday }),
      });
      if (!res.ok) throw new Error("Failed");
      setResult(`Aggregated data for ${yesterday}`);
    } catch {
      setResult("Aggregation failed");
    } finally {
      setAggregating(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={handleAggregate} disabled={aggregating} data-testid="button-aggregate">
        {aggregating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Run Yesterday's Aggregation
      </Button>
      {result && <span className="text-sm text-muted-foreground">{result}</span>}
    </div>
  );
}
