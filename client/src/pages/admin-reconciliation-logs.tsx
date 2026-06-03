import { useState } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, ChevronDown, ChevronRight, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ADMIN_UIDS = [
  ...(import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(","),
  ...(import.meta.env.VITE_QUIZ_ADMIN_UIDS || "").split(","),
].map((s: string) => s.trim()).filter(Boolean);

interface ReconciliationDetail {
  orderId: string;
  type?: string;
  paytmStatus: string;
  outcome: "acked" | "marked_failed" | "pending" | "error";
  error?: string;
  txnAmount?: string;
  txnId?: string;
}

interface ReconciliationLog {
  id: number;
  ranAt: string;
  checkedCount: number;
  ackedCount: number;
  failedCount: number;
  pendingCount: number;
  errorCount: number;
  details: ReconciliationDetail[];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function OutcomeBadge({ outcome }: { outcome: ReconciliationDetail["outcome"] }) {
  if (outcome === "acked") return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
      <CheckCircle2 className="h-3 w-3" /> Acked
    </span>
  );
  if (outcome === "marked_failed") return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
      <XCircle className="h-3 w-3" /> Failed
    </span>
  );
  if (outcome === "pending") return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
      <AlertCircle className="h-3 w-3" /> Error
    </span>
  );
}

function LogRow({ log }: { log: ReconciliationLog }) {
  const [expanded, setExpanded] = useState(false);
  const ranAt = new Date(log.ranAt);
  const dateStr = ranAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = ranAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden" data-testid={`log-row-${log.id}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
        data-testid={`button-expand-log-${log.id}`}
      >
        <span className="text-muted-foreground mt-0.5">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{dateStr}</span>
            <span className="text-xs text-muted-foreground">{timeStr}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground">Checked: <strong className="text-foreground">{log.checkedCount}</strong></span>
            {log.ackedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                <CheckCircle2 className="h-3 w-3" /> {log.ackedCount} acked
              </span>
            )}
            {log.failedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                <XCircle className="h-3 w-3" /> {log.failedCount} marked failed
              </span>
            )}
            {log.pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Clock className="h-3 w-3" /> {log.pendingCount} still pending
              </span>
            )}
            {log.errorCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                <AlertCircle className="h-3 w-3" /> {log.errorCount} errors
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && log.details.length > 0 && (
        <div className="border-t border-border/30 bg-muted/10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Order ID</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Paytm Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Outcome</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {log.details.map((d, i) => (
                  <tr key={i} className="border-b border-border/10 last:border-0" data-testid={`detail-row-${log.id}-${i}`}>
                    <td className="px-4 py-2 font-mono text-[11px] text-foreground/80 truncate max-w-[120px]" title={d.orderId}>
                      {d.orderId.length > 16 ? `…${d.orderId.slice(-12)}` : d.orderId}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{d.type || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.paytmStatus}</td>
                    <td className="px-3 py-2"><OutcomeBadge outcome={d.outcome} /></td>
                    <td className="px-3 py-2 text-muted-foreground">{d.txnAmount ? `₹${d.txnAmount}` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground break-all max-w-[180px]">
                      {d.error || d.txnId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {expanded && log.details.length === 0 && (
        <div className="border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
          No transactions were checked in this run.
        </div>
      )}
    </div>
  );
}

export default function AdminReconciliationLogs() {
  const { user, loading: authLoading, getToken } = useAuth();
  const { toast } = useToast();
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [logs, setLogs] = useState<ReconciliationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function fetchLogs() {
    if (!isAdmin || !getToken) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/admin/reconciliation-logs?from=${fromDate}&to=${toDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load");
      toast({ title: "Error loading logs", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RangoliLoader size={64} />
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

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5 max-w-5xl mx-auto" data-testid="admin-reconciliation-logs-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reconciliation Logs</h1>
          <p className="text-sm text-muted-foreground">Audit trail of automated reconciliation runs — every 15 minutes</p>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="block border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-from-date"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="block border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-to-date"
            />
          </div>
          <Button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2"
            data-testid="button-fetch-logs"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? "Loading…" : "Load Logs"}
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" data-testid="text-load-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {loadError}
        </div>
      )}

      {searched && !loading && logs.length === 0 && !loadError && (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-logs">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No reconciliation runs found</p>
          <p className="text-sm mt-1">Runs are logged every 15 minutes when there are pending transactions.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-2" data-testid="logs-list">
          <p className="text-xs text-muted-foreground">{logs.length} run{logs.length !== 1 ? "s" : ""} found</p>
          {logs.map(log => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
