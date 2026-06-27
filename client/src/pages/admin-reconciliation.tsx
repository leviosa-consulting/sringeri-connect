import { useState, useEffect, useCallback } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PendingTxn {
  orderId?: string;
  orderID?: string;
  paymentRef?: string;
  addedAt?: string;
  txnAmount?: string | number;
  amount?: string | number;
  txnDate?: string;
  date?: string;
  type?: string;
  category?: string;
  payeeName?: string;
  name?: string;
  email?: string;
  mobile?: string;
  [key: string]: any;
}

type RowStatus = "idle" | "checking" | "success" | "pending" | "failed" | "acking" | "acked" | "ack_failed";

interface RowState {
  status: RowStatus;
  message?: string;
  detail?: any;
}

function getOrderId(t: PendingTxn): string {
  return String(t.paymentRef || t.orderId || t.orderID || t.order_id || "");
}

function getAmount(t: PendingTxn): string {
  const a = t.txnAmount ?? t.amount ?? t.totalAmount;
  return a !== undefined ? String(a) : "—";
}

function getDate(t: PendingTxn): string {
  return String(t.addedAt || t.txnDate || t.date || t.bookingDate || t.donationDate || "—");
}

function getType(t: PendingTxn): string {
  return String(t.type || t.category || t.txnType || "—");
}

function getName(t: PendingTxn): string {
  return String(t.payeeName || t.name || t.devoteeName || "—");
}

export default function AdminReconciliation() {
  const { user, loading: authLoading, getToken, hasAdminRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = hasAdminRole("accounts");

  const [transactions, setTransactions] = useState<PendingTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [bulkRunning, setBulkRunning] = useState(false);

  const setRow = (orderId: string, state: RowState) =>
    setRowStates(prev => ({ ...prev, [orderId]: state }));

  const loadPending = useCallback(async () => {
    if (!isAdmin || !getToken) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/reconciliation/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: PendingTxn[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.transactions)
          ? data.transactions
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.pendingTransactions)
              ? data.pendingTransactions
              : [];
      setTransactions(list);
      setRowStates({});
    } catch (err: any) {
      console.error("Failed to load pending transactions:", err);
      setLoadError(err?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, getToken]);

  useEffect(() => { loadPending(); }, [loadPending]);

  async function checkStatus(orderId: string): Promise<RowState> {
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
        return s;
      }
      const status = String(data?.status || "UNKNOWN");
      let next: RowState;
      if (status === "TXN_SUCCESS") {
        next = { status: "success", message: data.resultMsg || "Success on Paytm", detail: data };
      } else if (status === "PENDING") {
        next = { status: "pending", message: data.resultMsg || "Still pending on Paytm", detail: data };
      } else {
        next = { status: "failed", message: data.resultMsg || status, detail: data };
      }
      setRow(orderId, next);
      if (!bulkRunning) {
        toast({
          title: `Order ${orderId.slice(-8)}: ${next.status === "success" ? "Paytm success" : next.status === "pending" ? "Pending on Paytm" : "Failed"}`,
          description: next.message,
          variant: next.status === "failed" ? "destructive" : "default",
        });
      }
      return next;
    } catch (err: any) {
      const s: RowState = { status: "failed", message: err?.message || "Check failed" };
      setRow(orderId, s);
      if (!bulkRunning) {
        toast({ title: "Status check failed", description: s.message, variant: "destructive" });
      }
      return s;
    }
  }

  async function sendAck(orderId: string): Promise<RowState> {
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
        return s;
      }
      const s: RowState = { status: "acked", message: "Acknowledgement sent", detail: data };
      setRow(orderId, s);
      if (!bulkRunning) {
        toast({ title: `Order ${orderId.slice(-8)}: reconciled`, description: "Acknowledgement sent successfully" });
      }
      return s;
    } catch (err: any) {
      const s: RowState = { status: "ack_failed", message: err?.message || "Ack failed" };
      setRow(orderId, s);
      if (!bulkRunning) {
        toast({ title: "Acknowledgement failed", description: s.message, variant: "destructive" });
      }
      return s;
    }
  }

  async function checkAndReconcileAll() {
    setBulkRunning(true);
    let okCount = 0;
    let pendCount = 0;
    let failCount = 0;
    let ackCount = 0;
    let ackFailCount = 0;
    for (const t of transactions) {
      const orderId = getOrderId(t);
      if (!orderId) continue;
      const checked = await checkStatus(orderId);
      if (checked.status === "success") {
        okCount++;
        const acked = await sendAck(orderId);
        if (acked.status === "acked") ackCount++;
        else ackFailCount++;
      } else if (checked.status === "pending") {
        pendCount++;
      } else if (checked.status === "failed") {
        failCount++;
      }
    }
    setBulkRunning(false);
    toast({
      title: "Reconciliation complete",
      description: `Success: ${okCount} (acked ${ackCount}${ackFailCount ? `, ${ackFailCount} ack failed` : ""}), Pending: ${pendCount}, Failed: ${failCount}`,
    });
  }

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

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-6 max-w-5xl mx-auto" data-testid="admin-reconciliation-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Transaction Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Verify pending payments with Paytm and acknowledge successful ones</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={loadPending}
          disabled={loading || bulkRunning}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Button
          size="sm"
          onClick={checkAndReconcileAll}
          disabled={loading || bulkRunning || transactions.length === 0}
          data-testid="button-reconcile-all"
        >
          {bulkRunning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
          Check & Reconcile All
        </Button>
        <span className="ml-auto text-sm text-muted-foreground self-center" data-testid="text-count">
          {transactions.length} pending
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <RangoliLoader size={48} />
        </div>
      ) : loadError ? (
        <div className="bg-card rounded-xl border border-border/50 p-6 text-center" data-testid="text-load-error">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-foreground">Failed to load pending transactions</p>
          <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-8 text-center" data-testid="text-no-pending">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No pending transactions</p>
          <p className="text-xs text-muted-foreground mt-1">All payments are reconciled.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-pending">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => {
                  const orderId = getOrderId(t);
                  const rs = rowStates[orderId] || { status: "idle" as RowStatus };
                  return (
                    <tr key={orderId || idx} className="border-b last:border-0 hover:bg-muted/10" data-testid={`row-txn-${orderId || idx}`}>
                      <td className="px-4 py-3 font-mono text-xs text-foreground max-w-[180px] truncate">{orderId || "—"}</td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">{getType(t)}</td>
                      <td className="px-4 py-3 text-foreground max-w-[140px] truncate">{getName(t)}</td>
                      <td className="px-4 py-3 text-right text-foreground">₹{getAmount(t)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{getDate(t)}</td>
                      <td className="px-4 py-3" data-testid={`status-${orderId || idx}`}>
                        <StatusBadge state={rs} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!orderId || rs.status === "checking" || rs.status === "acking" || bulkRunning}
                            onClick={() => checkStatus(orderId)}
                            data-testid={`button-check-${orderId || idx}`}
                          >
                            {rs.status === "checking" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check"}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!orderId || rs.status !== "success" || bulkRunning}
                            onClick={() => sendAck(orderId)}
                            data-testid={`button-ack-${orderId || idx}`}
                          >
                            {rs.status === "acking" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send Ack"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ state }: { state: RowState }) {
  const { status, message } = state;
  const cls = "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium";
  if (status === "idle") return <span className={`${cls} bg-muted text-muted-foreground`}>Pending check</span>;
  if (status === "checking") return <span className={`${cls} bg-blue-50 text-blue-700`}><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span>;
  if (status === "acking") return <span className={`${cls} bg-blue-50 text-blue-700`}><Loader2 className="h-3 w-3 animate-spin" /> Acknowledging…</span>;
  if (status === "success") return <span className={`${cls} bg-green-50 text-green-700`} title={message}><CheckCircle2 className="h-3 w-3" /> Paytm Success</span>;
  if (status === "acked") return <span className={`${cls} bg-green-50 text-green-700`} title={message}><CheckCircle2 className="h-3 w-3" /> Reconciled</span>;
  if (status === "pending") return <span className={`${cls} bg-amber-50 text-amber-700`} title={message}><Clock className="h-3 w-3" /> Pending on Paytm</span>;
  if (status === "failed") return <span className={`${cls} bg-red-50 text-red-700`} title={message}><AlertCircle className="h-3 w-3" /> {message || "Failed"}</span>;
  if (status === "ack_failed") return <span className={`${cls} bg-red-50 text-red-700`} title={message}><AlertCircle className="h-3 w-3" /> Ack failed</span>;
  return null;
}
