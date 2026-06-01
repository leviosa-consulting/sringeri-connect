import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface Props {
  typeKeywords: string[];
  sessionKey: string;
  label: string;
}

export function PendingTransactionBanner({ typeKeywords, sessionKey, label }: Props) {
  const { user, devoteeData, getToken } = useAuth();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(sessionKey));

  if (!user || user.isAnonymous || dismissed) return null;

  const cutoff = new Date("2026-06-01").getTime();
  const allTxns: any[] = devoteeData?.allTransactions || [];

  const pendingCount = allTxns.filter((t: any) => {
    const s = String(t.status ?? t.txnStatus ?? t.paymentStatus ?? t.state ?? "");
    if (!(s === "8" || s.toLowerCase() === "pending")) return false;

    const rawDate = t.txnDate || t.createdAt || t.date || t.bookingDate ||
      t.transactionDate || t.paymentDate || t.createdDate;
    if (rawDate) {
      try {
        const ms = new Date(rawDate).getTime();
        if (!isNaN(ms) && ms < cutoff) return false;
      } catch {}
    }

    const txnType = String(
      t.type ?? t.category ?? t.txnType ?? t.serviceType ?? ""
    ).toLowerCase();
    return typeKeywords.some(kw => txnType.includes(kw.toLowerCase()));
  }).length;

  if (pendingCount === 0) return null;

  const handleCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/user/reconcile-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDismissed(true);
      sessionStorage.setItem(sessionKey, "1");
      const parts: string[] = [];
      if (data.reconciled) parts.push(`${data.reconciled} confirmed`);
      if (data.markedFailed) parts.push(`${data.markedFailed} failed`);
      if (data.pending) parts.push(`${data.pending} still pending`);
      toast({
        title: "Transaction status checked",
        description: parts.length ? parts.join(", ") : "All transactions checked",
      });
    } catch {
      toast({ title: "Check failed", description: "Could not check transaction status", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(sessionKey, "1");
  };

  return (
    <div className="mx-4 mt-3">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200" data-testid={`banner-pending-${label}`}>
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            {pendingCount} pending {label} payment{pendingCount > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Recent payments may be unconfirmed. Tap below to check and update.
          </p>
          <div className="flex items-center gap-3 mt-2.5">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
              data-testid={`button-check-pending-${label}`}
            >
              {checking ? <><Loader2 className="h-3 w-3 animate-spin" /> Checking…</> : "Check Status"}
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-amber-700 hover:text-amber-900 font-medium"
              data-testid={`button-dismiss-pending-${label}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
