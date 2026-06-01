import { useState, useCallback } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, RefreshCw, AlertCircle, Search, ListFilter, CheckCircle2, Clock, XCircle, Loader2, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ADMIN_UIDS = [
  ...(import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(","),
  ...(import.meta.env.VITE_QUIZ_ADMIN_UIDS || "").split(","),
].map((s: string) => s.trim()).filter(Boolean);

interface Transaction {
  [key: string]: any;
}

type RowStatus =
  | "idle"
  | "checking"
  | "success"
  | "pending"
  | "failed"        // check itself failed (network/auth/HTTP error) — do NOT auto-mark-failed
  | "paytm_failed"  // Paytm explicitly reported failure — safe to auto-mark-failed
  | "acking"
  | "acked"
  | "ack_failed"
  | "marking"
  | "marked"
  | "mark_failed";

interface RowState {
  status: RowStatus;
  message?: string;
  detail?: any;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function getField(t: Transaction, ...keys: string[]): string {
  for (const k of keys) {
    if (t[k] !== undefined && t[k] !== null && t[k] !== "") return String(t[k]);
  }
  return "—";
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status);
  if (s === "1" || s.toLowerCase() === "success" || s.toLowerCase() === "txn_success") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Success
      </span>
    );
  }
  if (s === "8" || s.toLowerCase() === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  if (s === "9" || s.toLowerCase().includes("fail")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  if (s === "—") return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
      {s}
    </span>
  );
}

function ActionCell({ orderId, rowState, onResolve, onRetryAck, onRetryMarkFailed, bulkRunning }: {
  orderId: string;
  rowState: RowState;
  onResolve: () => void;
  onRetryAck: () => void;
  onRetryMarkFailed: () => void;
  bulkRunning: boolean;
}) {
  if (orderId === "—") return <td className="px-3 py-3" />;

  const { status, message, detail } = rowState;

  return (
    <td className="px-3 py-3 whitespace-nowrap">
      <div className="flex flex-col gap-1 items-start">
        {status === "idle" && (
          <button
            onClick={onResolve}
            disabled={bulkRunning}
            className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid={`button-resolve-${orderId}`}
          >
            Check & Resolve
          </button>
        )}

        {(status === "checking" || status === "success" || status === "paytm_failed") && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking…
          </span>
        )}

        {status === "failed" && (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
              <XCircle className="h-3 w-3" /> Check error
            </span>
            {message && <span className="text-[10px] text-muted-foreground max-w-[120px] truncate" title={message}>{message}</span>}
            <button
              onClick={onResolve}
              className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
            >
              Re-check
            </button>
          </div>
        )}

        {status === "pending" && (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Clock className="h-3 w-3" /> Still Pending
            </span>
            <button
              onClick={onResolve}
              className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
            >
              Re-check
            </button>
          </div>
        )}

        {(status === "acking" || status === "marking") && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {status === "acking" ? "Reconciling…" : "Updating…"}
          </span>
        )}

        {status === "acked" && (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Reconciled ✓
          </span>
        )}

        {status === "marked" && (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-xs text-red-700 font-semibold">
              <XCircle className="h-3 w-3" /> Marked Failed ✓
            </span>
            {detail?.failResponse && (
              <span className="text-[10px] text-muted-foreground break-all whitespace-pre-wrap max-w-[180px]">
                {typeof detail.failResponse === "string"
                  ? detail.failResponse
                  : JSON.stringify(detail.failResponse)}
              </span>
            )}
          </div>
        )}

        {status === "ack_failed" && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-red-600 font-medium">ACK failed</span>
            {message && <span className="text-[10px] text-muted-foreground max-w-[120px] truncate" title={message}>{message}</span>}
            <button onClick={onRetryAck} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70">
              Retry
            </button>
          </div>
        )}

        {status === "mark_failed" && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-red-600 font-medium">Update failed</span>
            {message && (
              <span className="text-[10px] text-muted-foreground break-all whitespace-pre-wrap max-w-[180px]">
                {message}
              </span>
            )}
            <button onClick={onRetryMarkFailed} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70">
              Retry
            </button>
          </div>
        )}
      </div>
    </td>
  );
}

export default function AdminAllTransactions() {
  const { user, loading: authLoading, getToken } = useAuth();
  const { toast } = useToast();
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  const setRow = (orderId: string, state: RowState) =>
    setRowStates(prev => ({ ...prev, [orderId]: state }));

  const getRow = (orderId: string): RowState =>
    rowStates[orderId] ?? { status: "idle" };

  const fetchTransactions = useCallback(async () => {
    if (!isAdmin || !getToken) return;
    setLoading(true);
    setLoadError(null);
    setFilter("");
    setStatusFilter("all");
    setTypeFilter("all");
    setRowStates({});
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/admin/allTransactions/${fromDate}/${toDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Transaction[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.transactions)
          ? data.transactions
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setTransactions(list);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [isAdmin, getToken, fromDate, toDate]);

  async function checkStatus(orderId: string, silent = false): Promise<RowStatus> {
    setRow(orderId, { status: "checking" });
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/reconciliation/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const s: RowState = { status: "failed", message: data?.error || `HTTP ${res.status}` };
        setRow(orderId, s);
        if (!silent) toast({ title: `Check failed`, description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        return "failed";
      }
      const paytmStatus = String(data?.status || "UNKNOWN");
      let next: RowState;
      if (paytmStatus === "TXN_SUCCESS") {
        next = { status: "success", message: data.resultMsg, detail: data };
        if (!silent) toast({ title: `Order …${orderId.slice(-8)}: Success on Paytm`, description: data.resultMsg || "Ready to reconcile" });
      } else if (paytmStatus === "PENDING") {
        next = { status: "pending", message: data.resultMsg, detail: data };
        if (!silent) toast({ title: `Order …${orderId.slice(-8)}: Still Pending`, description: data.resultMsg || "Try again later", variant: "default" });
      } else {
        // Paytm explicitly reported a failure — distinct from a check error
        next = { status: "paytm_failed", message: data.resultMsg || paytmStatus, detail: data };
        if (!silent) toast({ title: `Order …${orderId.slice(-8)}: Failed on Paytm`, description: data.resultMsg || paytmStatus, variant: "destructive" });
      }
      setRow(orderId, next);
      return next.status;
    } catch (err: any) {
      const s: RowState = { status: "failed", message: err?.message || "Check failed" };
      setRow(orderId, s);
      if (!silent) toast({ title: "Status check error", description: s.message, variant: "destructive" });
      return "failed";
    }
  }

  async function sendAck(orderId: string, silent = false): Promise<RowStatus> {
    setRow(orderId, { status: "acking" });
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/reconciliation/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const s: RowState = { status: "ack_failed", message: data?.error || `HTTP ${res.status}` };
        setRow(orderId, s);
        if (!silent) toast({ title: "Reconcile failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        return "ack_failed";
      }
      setRow(orderId, { status: "acked", message: "Acknowledged", detail: data });
      if (!silent) toast({ title: `Order …${orderId.slice(-8)}: Reconciled`, description: "Payment acknowledged successfully." });
      return "acked";
    } catch (err: any) {
      const s: RowState = { status: "ack_failed", message: err?.message || "ACK failed" };
      setRow(orderId, s);
      if (!silent) toast({ title: "Reconcile error", description: s.message, variant: "destructive" });
      return "ack_failed";
    }
  }

  async function checkAndReconcileAll() {
    setBulkRunning(true);
    let successCount = 0, pendingCount = 0, failedCount = 0, ackedCount = 0, ackFailCount = 0, skippedCount = 0;
    for (const t of filtered) {
      const orderId = getField(t, "paymentRef", "orderId", "orderID", "order_id", "txnId");
      if (orderId === "—") continue;
      // Skip rows already acted on in this session
      const currentState = rowStates[orderId]?.status ?? "idle";
      if (currentState !== "idle") continue;
      // Skip transactions that are already confirmed successful (status=1) — no need to hit Paytm
      const txnStatus = getField(t, "status", "txnStatus", "paymentStatus", "state");
      const alreadySuccess = txnStatus === "1" || txnStatus.toLowerCase() === "success" || txnStatus.toLowerCase() === "txn_success";
      if (alreadySuccess) { skippedCount++; continue; }

      const checked = await checkStatus(orderId, true);
      if (checked === "success") {
        successCount++;
        const acked = await sendAck(orderId, true);
        if (acked === "acked") ackedCount++;
        else ackFailCount++;
      } else if (checked === "pending") {
        pendingCount++;
      } else if (checked === "paytm_failed") {
        // Paytm confirmed failure — auto-mark
        await markFailed(orderId, true);
        failedCount++;
      } else {
        // check error — don't auto-mark, just count
        failedCount++;
      }
    }
    setBulkRunning(false);
    const parts = [];
    if (successCount) parts.push(`${successCount} success (${ackedCount} reconciled${ackFailCount ? `, ${ackFailCount} ack failed` : ""})`);
    if (pendingCount) parts.push(`${pendingCount} pending`);
    if (failedCount) parts.push(`${failedCount} failed`);
    if (skippedCount) parts.push(`${skippedCount} already-success skipped`);
    toast({
      title: "Check & Reconcile complete",
      description: parts.length ? parts.join(", ") : "No idle transactions to process",
    });
  }

  async function markFailed(orderId: string, silent = false): Promise<RowStatus> {
    setRow(orderId, { status: "marking" });
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/reconciliation/mark-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        const s: RowState = data?.status === "PENDING"
          ? { status: "pending", message: "Still pending on Paytm — cannot mark failed" }
          : { status: "mark_failed", message: msg };
        setRow(orderId, s);
        if (!silent) toast({ title: "Mark failed error", description: msg, variant: "destructive" });
        return s.status;
      }
      setRow(orderId, { status: "marked", detail: data });
      if (!silent) toast({ title: `Order …${orderId.slice(-8)}: Marked as Failed`, description: "Transaction updated successfully." });
      return "marked";
    } catch (err: any) {
      const s: RowState = { status: "mark_failed", message: err?.message || "Update failed" };
      setRow(orderId, s);
      if (!silent) toast({ title: "Mark failed error", description: s.message, variant: "destructive" });
      return "mark_failed";
    }
  }

  async function checkAndResolve(orderId: string) {
    const checked = await checkStatus(orderId, true);
    if (checked === "success") {
      const acked = await sendAck(orderId, true);
      if (acked === "acked") {
        toast({ title: `Order …${orderId.slice(-8)}: Reconciled ✓`, description: "Confirmed on Paytm and acknowledged." });
      } else {
        toast({ title: `ACK failed — …${orderId.slice(-8)}`, description: "Paytm success but reconcile step failed. Use Retry.", variant: "destructive" });
      }
    } else if (checked === "pending") {
      toast({ title: `Order …${orderId.slice(-8)}: Still Pending`, description: "Transaction still pending on Paytm. Try again later." });
    } else if (checked === "paytm_failed") {
      // Only auto-mark-failed when Paytm explicitly reported failure — not on check errors
      const marked = await markFailed(orderId, true);
      if (marked === "marked") {
        toast({ title: `Order …${orderId.slice(-8)}: Marked Failed ✓`, description: "Confirmed failed on Paytm — transaction updated." });
      } else if (marked === "pending") {
        toast({ title: `Order …${orderId.slice(-8)}: Still Pending`, description: "Cannot mark as failed while still pending on Paytm." });
      } else {
        toast({ title: `Could not mark …${orderId.slice(-8)}`, description: "Failed on Paytm but Sringeri update failed. Use Retry.", variant: "destructive" });
      }
    } else {
      // checked === "failed": the status check itself encountered an error — do NOT auto-mark
      toast({ title: `Check failed — …${orderId.slice(-8)}`, description: "Could not reach Paytm. Use Re-check to try again.", variant: "destructive" });
    }
  }

  const matchesStatusFilter = (t: Transaction) => {
    if (statusFilter === "all") return true;
    const s = getField(t, "status", "txnStatus", "paymentStatus", "state");
    if (statusFilter === "success") return s === "1" || s.toLowerCase() === "success" || s.toLowerCase() === "txn_success";
    if (statusFilter === "pending") return s === "8" || s.toLowerCase() === "pending";
    if (statusFilter === "failed") return s === "9" || s.toLowerCase().includes("fail");
    return true;
  };

  const uniqueTypes = Array.from(new Set(
    transactions.map(t => getField(t, "type", "category", "txnType", "serviceType")).filter(v => v && v !== "—")
  )).sort();

  const filtered = transactions.filter(t => {
    if (!matchesStatusFilter(t)) return false;
    if (typeFilter !== "all") {
      const txnType = getField(t, "type", "category", "txnType", "serviceType");
      if (txnType !== typeFilter) return false;
    }
    if (filter.trim() && !Object.values(t).some(v =>
      String(v ?? "").toLowerCase().includes(filter.toLowerCase())
    )) return false;
    return true;
  });

  const countByStatus = (code: string) =>
    transactions.filter(t => {
      const s = getField(t, "status", "txnStatus", "paymentStatus", "state");
      if (code === "1") return s === "1" || s.toLowerCase() === "success" || s.toLowerCase() === "txn_success";
      if (code === "8") return s === "8" || s.toLowerCase() === "pending";
      if (code === "9") return s === "9" || s.toLowerCase().includes("fail");
      return false;
    }).length;

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
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5 max-w-6xl mx-auto" data-testid="admin-all-transactions-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Transactions</h1>
          <p className="text-sm text-muted-foreground">View and reconcile transactions across all statuses for a date range</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              data-testid="input-from-date"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              data-testid="input-to-date"
            />
          </div>
          <Button
            onClick={fetchTransactions}
            disabled={loading || !fromDate || !toDate}
            data-testid="button-fetch-transactions"
          >
            {loading
              ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
              : <Search className="h-4 w-4 mr-1.5" />
            }
            {loading ? "Loading…" : "Fetch Transactions"}
          </Button>
          {searched && !loading && (
            <span className="text-sm text-muted-foreground self-center ml-auto" data-testid="text-count">
              {filter.trim() ? `${filtered.length} of ` : ""}{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <RangoliLoader size={48} />
        </div>
      ) : loadError ? (
        <div className="bg-card rounded-xl border border-border/50 p-8 text-center" data-testid="text-load-error">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Failed to load transactions</p>
          <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
        </div>
      ) : searched && transactions.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-8 text-center" data-testid="text-no-results">
          <ListFilter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No transactions found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting the date range.</p>
        </div>
      ) : searched && transactions.length > 0 ? (
        <>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter(statusFilter === "success" ? "all" : "success")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === "success" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
              data-testid="filter-success"
            >
              <CheckCircle2 className="h-3 w-3" /> Success: {countByStatus("1")}
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === "pending" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
              data-testid="filter-pending"
            >
              <Clock className="h-3 w-3" /> Pending: {countByStatus("8")}
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === "failed" ? "all" : "failed")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === "failed" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
              data-testid="filter-failed"
            >
              <XCircle className="h-3 w-3" /> Failed: {countByStatus("9")}
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
              data-testid="filter-all"
            >
              Total: {transactions.length}
            </button>
            <Button
              size="sm"
              onClick={checkAndReconcileAll}
              disabled={bulkRunning || filtered.filter(t => {
                const id = getField(t, "paymentRef", "orderId", "orderID", "order_id", "txnId");
                return (rowStates[id]?.status ?? "idle") === "idle";
              }).length === 0}
              className="ml-auto"
              data-testid="button-check-reconcile-all"
            >
              {bulkRunning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
              {bulkRunning ? "Checking…" : "Check & Reconcile All"}
            </Button>
          </div>

          {uniqueTypes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium shrink-0">Type:</span>
              <button
                onClick={() => setTypeFilter("all")}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${typeFilter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                data-testid="filter-type-all"
              >
                All
              </button>
              {uniqueTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${typeFilter === type ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                  data-testid={`filter-type-${type}`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name, order ID, type, status…"
              className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              data-testid="input-filter"
            />
          </div>

          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-all-transactions">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Order / Ref ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mobile</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => {
                    const orderId = getField(t, "paymentRef", "orderId", "orderID", "order_id", "txnId");
                    const status = getField(t, "status", "txnStatus", "paymentStatus", "state");
                    const rowState = getRow(orderId);
                    return (
                      <tr
                        key={orderId !== "—" ? orderId : idx}
                        className="border-b last:border-0 hover:bg-muted/10"
                        data-testid={`row-txn-${idx}`}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground max-w-[200px] truncate" title={orderId}>{orderId}</td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {getField(t, "type", "category", "txnType", "serviceType")}
                        </td>
                        <td className="px-4 py-3 text-foreground max-w-[160px] truncate">
                          {getField(t, "payeeName", "name", "devoteeName", "donorName", "customerName")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {getField(t, "mobile", "mobileNumber", "phone")}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          ₹{getField(t, "txnAmount", "amount", "totalAmount")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {getField(t, "addedAt", "txnDate", "date", "bookingDate", "donationDate", "createdAt")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <ActionCell
                          orderId={orderId}
                          rowState={rowState}
                          onResolve={() => checkAndResolve(orderId)}
                          onRetryAck={() => sendAck(orderId)}
                          onRetryMarkFailed={() => markFailed(orderId)}
                          bulkRunning={bulkRunning}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 p-10 text-center" data-testid="text-prompt">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Select a date range and fetch</p>
          <p className="text-xs text-muted-foreground mt-1">Both dates default to today. Click Fetch Transactions to load.</p>
        </div>
      )}
    </div>
  );
}
