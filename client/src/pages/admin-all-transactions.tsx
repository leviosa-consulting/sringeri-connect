import { useState, useCallback } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, RefreshCw, AlertCircle, Search, ListFilter, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const ADMIN_UIDS = [
  ...(import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(","),
  ...(import.meta.env.VITE_QUIZ_ADMIN_UIDS || "").split(","),
].map((s: string) => s.trim()).filter(Boolean);

interface Transaction {
  [key: string]: any;
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

export default function AdminAllTransactions() {
  const { user, loading: authLoading, getToken } = useAuth();
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState("");

  const fetchTransactions = useCallback(async () => {
    if (!isAdmin || !getToken) return;
    setLoading(true);
    setLoadError(null);
    setFilter("");
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

  const filtered = filter.trim()
    ? transactions.filter(t =>
        Object.values(t).some(v =>
          String(v ?? "").toLowerCase().includes(filter.toLowerCase())
        )
      )
    : transactions;

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Transactions</h1>
          <p className="text-sm text-muted-foreground">View all transactions across all statuses for a date range</p>
        </div>
      </div>

      {/* Date range + fetch */}
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

      {/* Body */}
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
          {/* Summary chips */}
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Success: {countByStatus("1")}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
              <Clock className="h-3 w-3" /> Pending: {countByStatus("8")}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
              <XCircle className="h-3 w-3" /> Failed: {countByStatus("9")}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              Total: {transactions.length}
            </span>
          </div>

          {/* Filter */}
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

          {/* Table */}
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => {
                    const orderId = getField(t, "paymentRef", "orderId", "orderID", "order_id", "txnId");
                    const status = getField(t, "status", "txnStatus", "paymentStatus", "state");
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
