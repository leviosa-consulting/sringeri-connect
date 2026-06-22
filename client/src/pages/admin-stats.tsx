import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RangoliLoader } from "@/components/rangoli-loader";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Download, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  ComposedChart, Line, CartesianGrid,
} from "recharts";

const ADMIN_UIDS = [
  ...(import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(","),
  ...(import.meta.env.VITE_QUIZ_ADMIN_UIDS || "").split(","),
].map((s: string) => s.trim()).filter(Boolean);

const CAT_COLORS = ["#c2440f", "#e07b39", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

type Period = "day" | "week" | "month" | "year";
type Section = "overview" | "donations" | "seva" | "accommodation" | "fastline" | "seva-report" | "donation-report";
type DonFilter = "all" | "80g" | "non80g";

interface NormalizedTxn {
  _id: string;
  _name: string;
  _amount: number;
  _date: string;
  _rawDate: string;
  _type: string;
  _category: "donation" | "seva" | "accommodation" | "fastline" | "other";
  _is80G: boolean;
  _orderId: string;
  _mobile: string;
  _sevaName: string;
  _donationCategory: string;
  _building: string;
}

function gf(t: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    if (t[k] !== undefined && t[k] !== null && t[k] !== "") return String(t[k]);
  }
  return "";
}

function parseAmt(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDateStr(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "number") return new Date(raw).toISOString().split("T")[0];
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
    const [d, m, y] = s.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  try { return new Date(s).toISOString().split("T")[0]; } catch { return s; }
}

function categorize(rawType: string): NormalizedTxn["_category"] {
  const t = rawType.toLowerCase();
  if (t.includes("fastline") || t === "fl" || t.includes("today seva") || t.includes("quick seva")) return "fastline";
  if (t.includes("donat") || t.includes("80g") || t.includes("80-g")) return "donation";
  if (t.includes("seva") || t.includes("puja") || t.includes("archana") || t.includes("homa") || t.includes("receipt") || t.includes("kalyana")) return "seva";
  if (t.includes("room") || t.includes("accommodation") || t.includes("yatri") || t.includes("reserv") || t.includes("lodge") || t.includes("cottage") || t.includes("guest")) return "accommodation";
  return "other";
}

function isSuccess(t: Record<string, any>): boolean {
  const s = gf(t, "status", "txnStatus", "paymentStatus", "state");
  return s === "1" || s.toLowerCase() === "success" || s.toLowerCase() === "txn_success";
}

function normalize(t: Record<string, any>): NormalizedTxn {
  const rawType = gf(t, "type", "category", "txnType", "serviceType", "headingName", "donationType");
  const rawDate = gf(t, "addedAt", "txnDate", "date", "bookingDate", "donationDate", "createdAt");
  const typeLC = rawType.toLowerCase();
  const is80G = typeLC.includes("80g") || typeLC.includes("80-g") || typeLC.includes("sec.80") ||
    gf(t, "donationType", "receiptType", "categoryType").toLowerCase().includes("80g");
  return {
    _id: gf(t, "paymentRef", "orderId", "orderID", "order_id", "txnId", "id"),
    _name: gf(t, "payeeName", "name", "devoteeName", "donorName", "customerName", "devotee"),
    _amount: parseAmt(gf(t, "txnAmount", "amount", "totalAmount") || 0),
    _date: parseDateStr(rawDate),
    _rawDate: rawDate,
    _type: rawType,
    _category: categorize(rawType),
    _is80G: is80G,
    _orderId: gf(t, "paymentRef", "orderId", "orderID", "order_id", "txnId"),
    _mobile: gf(t, "mobile", "mobileNumber", "phone"),
    _sevaName: gf(t, "sevaName", "deitySevaName", "productName", "serviceName") || rawType,
    _donationCategory: gf(t, "categoryName", "donationCategory", "heading", "headingName", "subCategoryName") || rawType,
    _building: gf(t, "building", "buildingName", "roomType", "block", "roomCategory"),
  };
}

function today(): string { return new Date().toISOString().split("T")[0]; }
function fmtDate(s: string): string {
  try { return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
  catch { return s; }
}
function fmtMonth(s: string): string {
  try { return new Date(s + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); }
  catch { return s; }
}
const fmtCurr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function getPeriodDates(period: Period): { from: string; to: string; prevFrom: string; prevTo: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  let from: Date, to: Date, prevFrom: Date, prevTo: Date;
  to = new Date(now);
  switch (period) {
    case "day":
      from = new Date(now);
      prevFrom = new Date(now); prevFrom.setDate(now.getDate() - 1);
      prevTo = new Date(prevFrom);
      break;
    case "week":
      from = new Date(now); from.setDate(now.getDate() - 6);
      prevFrom = new Date(now); prevFrom.setDate(now.getDate() - 13);
      prevTo = new Date(now); prevTo.setDate(now.getDate() - 7);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevTo = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      prevFrom = new Date(now.getFullYear() - 1, 0, 1);
      prevTo = new Date(now.getFullYear() - 1, 11, 31);
      break;
  }
  return { from: fmt(from), to: fmt(to!), prevFrom: fmt(prevFrom!), prevTo: fmt(prevTo!) };
}

function groupByDate(txns: NormalizedTxn[], period: Period) {
  const map = new Map<string, { amount: number; count: number }>();
  for (const t of txns) {
    const key = period === "year" ? t._date.substring(0, 7) : t._date.substring(0, 10);
    const prev = map.get(key) || { amount: 0, count: 0 };
    map.set(key, { amount: prev.amount + t._amount, count: prev.count + 1 });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, d]) => ({ label: period === "year" ? fmtMonth(key) : fmtDate(key), key, amount: Math.round(d.amount), count: d.count }));
}

function topN<T>(arr: T[], key: (t: T) => number, n = 10): T[] {
  return [...arr].sort((a, b) => key(b) - key(a)).slice(0, n);
}

function topContributors(txns: NormalizedTxn[], n = 10) {
  const map = new Map<string, { name: string; amount: number; count: number }>();
  for (const t of txns) {
    const k = t._name || "Unknown";
    const prev = map.get(k) || { name: k, amount: 0, count: 0 };
    map.set(k, { name: k, amount: prev.amount + t._amount, count: prev.count + 1 });
  }
  return topN(Array.from(map.values()), v => v.amount, n);
}

function topByField(txns: NormalizedTxn[], field: keyof NormalizedTxn, n = 10) {
  const map = new Map<string, { name: string; amount: number; count: number }>();
  for (const t of txns) {
    const k = String(t[field] || "Unknown") || "Unknown";
    if (!k || k === "Unknown" || k === "—") continue;
    const prev = map.get(k) || { name: k, amount: 0, count: 0 };
    map.set(k, { name: k, amount: prev.amount + t._amount, count: prev.count + 1 });
  }
  return topN(Array.from(map.values()), v => v.amount, n);
}

function growthPct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function downloadCsv(rows: (string | number)[][], filename: string) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function fetchTxns(from: string, to: string, token: string): Promise<NormalizedTxn[]> {
  const res = await fetch(`/api/admin/allTransactions/${from}/${to}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.transactions) ? data.transactions : Array.isArray(data?.data) ? data.data : [];
  return list.filter(isSuccess).map(normalize);
}

function KpiCard({ label, value, sub, growth }: { label: string; value: string; sub?: string; growth?: number | null }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {(sub || growth !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          {growth !== null && growth !== undefined && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${growth > 0 ? "text-green-600" : growth < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {growth > 0 ? <TrendingUp className="h-3 w-3" /> : growth < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {growth > 0 ? "+" : ""}{growth}% vs prev
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function NoData({ msg = "No data for this period" }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function HBar({ data, valueKey = "amount", labelKey = "name", height }: { data: any[]; valueKey?: string; labelKey?: string; height?: number }) {
  if (!data.length) return <NoData />;
  const h = height ?? Math.max(180, data.length * 36);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey={labelKey} width={130} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: any) => fmtCurr(Number(v))} />
        <Bar dataKey={valueKey} radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TimeBarChart({ data, period }: { data: any[]; period: Period }) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={period === "month" ? -45 : 0} textAnchor={period === "month" ? "end" : "middle"} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={48} />
        <Tooltip formatter={(v: any) => fmtCurr(Number(v))} />
        <Bar dataKey="amount" fill="#c2440f" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DualAxisChart({ data }: { data: any[] }) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval="preserveStartEnd" />
        <YAxis yAxisId="left" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={48} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={32} />
        <Tooltip formatter={(v: any, name: string) => name === "amount" ? fmtCurr(Number(v)) : v} />
        <Bar yAxisId="left" dataKey="amount" fill="#c2440f" radius={[3, 3, 0, 0]} name="amount" />
        <Line yAxisId="right" type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} name="count" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function TopTable({ rows, amtLabel = "Total ₹", countLabel = "Count" }: { rows: { name: string; amount: number; count: number }[]; amtLabel?: string; countLabel?: string }) {
  if (!rows.length) return <NoData />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">#</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Name</th>
            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">{countLabel}</th>
            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">{amtLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
              <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-foreground max-w-[200px] truncate">{r.name}</td>
              <td className="px-3 py-2 text-right text-foreground">{r.count}</td>
              <td className="px-3 py-2 text-right font-medium text-foreground">{fmtCurr(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder = "Select items…" }: {
  options: string[]; selected: Set<string>; onChange: (s: Set<string>) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.size === options.length && options.length > 0;
  return (
    <div className="relative">
      <button
        type="button"
        className="w-full text-left border border-border rounded-lg px-3 py-2 text-sm bg-background flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
        data-testid="button-multiselect-toggle"
      >
        <span className="text-muted-foreground truncate">
          {selected.size === 0 ? placeholder : `${selected.size} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full border border-border rounded-lg bg-background shadow-lg max-h-48 overflow-y-auto">
          <label className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-muted/50 border-b border-border">
            <input type="checkbox" checked={allSelected} onChange={() => onChange(allSelected ? new Set() : new Set(options))} className="accent-primary" />
            <span className="font-semibold">Select All ({options.length})</span>
          </label>
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-muted/50">
              <input type="checkbox" checked={selected.has(opt)} onChange={() => {
                const next = new Set(selected);
                next.has(opt) ? next.delete(opt) : next.add(opt);
                onChange(next);
              }} className="accent-primary" />
              <span className="truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminStats() {
  const { user, loading: authLoading, getToken } = useAuth();
  const { toast } = useToast();
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  const [period, setPeriod] = useState<Period>("month");
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [txns, setTxns] = useState<NormalizedTxn[]>([]);
  const [prevTxns, setPrevTxns] = useState<NormalizedTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [donFilter, setDonFilter] = useState<DonFilter>("all");

  const { from, to, prevFrom, prevTo } = useMemo(() => getPeriodDates(period), [period]);

  const loadData = useCallback(async () => {
    if (!getToken) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const [curr, prev] = await Promise.all([
        fetchTxns(from, to, token),
        fetchTxns(prevFrom, prevTo, token).catch(() => []),
      ]);
      setTxns(curr);
      setPrevTxns(prev);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      toast({ title: "Failed to load transactions", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [from, to, prevFrom, prevTo, getToken]);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]);

  const donations = useMemo(() => txns.filter(t => t._category === "donation"), [txns]);
  const sevas = useMemo(() => txns.filter(t => t._category === "seva"), [txns]);
  const accommodation = useMemo(() => txns.filter(t => t._category === "accommodation"), [txns]);
  const fastline = useMemo(() => txns.filter(t => t._category === "fastline"), [txns]);

  const prevDonations = useMemo(() => prevTxns.filter(t => t._category === "donation"), [prevTxns]);
  const prevSevas = useMemo(() => prevTxns.filter(t => t._category === "seva"), [prevTxns]);

  const filteredDonations = useMemo(() => {
    if (donFilter === "80g") return donations.filter(t => t._is80G);
    if (donFilter === "non80g") return donations.filter(t => !t._is80G);
    return donations;
  }, [donations, donFilter]);

  const totalRevenue = useMemo(() => txns.reduce((s, t) => s + t._amount, 0), [txns]);
  const prevTotalRevenue = useMemo(() => prevTxns.reduce((s, t) => s + t._amount, 0), [prevTxns]);
  const avgTxn = txns.length ? totalRevenue / txns.length : 0;

  const donutData = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const t of txns) cats[t._category] = (cats[t._category] || 0) + t._amount;
    return Object.entries(cats).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) })).filter(d => d.value > 0);
  }, [txns]);

  const peakDay = useCallback((arr: NormalizedTxn[]) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = new Map<number, number>();
    for (const t of arr) {
      try { const d = new Date(t._date + "T00:00:00").getDay(); map.set(d, (map.get(d) || 0) + t._amount); }
      catch { }
    }
    if (!map.size) return null;
    const best = Array.from(map.entries()).sort(([, a], [, b]) => b - a)[0];
    return days[best[0]];
  }, []);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><RangoliLoader size={64} /></div>;
  }
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2" data-testid="text-access-denied">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">This page is only for authorized administrators.</p>
        </div>
      </div>
    );
  }

  const sections: { key: Section; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "donations", label: "Donations" },
    { key: "seva", label: "Seva" },
    { key: "accommodation", label: "Accommodation" },
    { key: "fastline", label: "Fastline" },
    { key: "seva-report", label: "Seva Report" },
    { key: "donation-report", label: "Donation Report" },
  ];

  const periods: { key: Period; label: string }[] = [
    { key: "day", label: "Today" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ];

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5 max-w-6xl mx-auto" data-testid="admin-stats-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Revenue & Stats</h1>
          <p className="text-sm text-muted-foreground">Successful transactions only</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData} disabled={loading} data-testid="button-refresh">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {periods.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${period === p.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            data-testid={`period-${p.key}`}>{p.label}</button>
        ))}
        {!loading && txns.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{txns.length} transactions · {from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`}</span>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeSection === s.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/50"}`}
            data-testid={`section-${s.key}`}>{s.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RangoliLoader size={48} /></div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      ) : (
        <>
          {activeSection === "overview" && <OverviewSection txns={txns} prevTxns={prevTxns} totalRevenue={totalRevenue} prevTotalRevenue={prevTotalRevenue} avgTxn={avgTxn} donutData={donutData} period={period} />}
          {activeSection === "donations" && <DonationsSection txns={filteredDonations} prevTxns={prevDonations} period={period} donFilter={donFilter} setDonFilter={setDonFilter} peakDay={peakDay(filteredDonations)} />}
          {activeSection === "seva" && <SevaSection txns={sevas} prevTxns={prevSevas} period={period} peakDay={peakDay(sevas)} />}
          {activeSection === "accommodation" && <AccommodationSection txns={accommodation} period={period} peakDay={peakDay(accommodation)} />}
          {activeSection === "fastline" && <FastlineSection txns={fastline} period={period} peakDay={peakDay(fastline)} />}
          {activeSection === "seva-report" && <SevaReport getToken={getToken!} />}
          {activeSection === "donation-report" && <DonationReport getToken={getToken!} />}
        </>
      )}
    </div>
  );
}

function OverviewSection({ txns, prevTxns, totalRevenue, prevTotalRevenue, avgTxn, donutData, period }: {
  txns: NormalizedTxn[]; prevTxns: NormalizedTxn[]; totalRevenue: number; prevTotalRevenue: number; avgTxn: number; donutData: any[]; period: Period;
}) {
  const growth = growthPct(totalRevenue, prevTotalRevenue);
  const timeSeries = useMemo(() => groupByDate(txns, period), [txns, period]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Total Revenue" value={fmtCurr(totalRevenue)} growth={growth} />
        <KpiCard label="Transactions" value={String(txns.length)} sub={`prev: ${prevTxns.length}`} />
        <KpiCard label="Avg Transaction" value={fmtCurr(Math.round(avgTxn))} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Revenue Trend">
          <TimeBarChart data={timeSeries} period={period} />
        </SectionCard>
        <SectionCard title="Revenue Split">
          {donutData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtCurr(Number(v))} />
                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </SectionCard>
      </div>
    </div>
  );
}

function DonationsSection({ txns, prevTxns, period, donFilter, setDonFilter, peakDay }: {
  txns: NormalizedTxn[]; prevTxns: NormalizedTxn[]; period: Period; donFilter: DonFilter; setDonFilter: (f: DonFilter) => void; peakDay: string | null;
}) {
  const total = txns.reduce((s, t) => s + t._amount, 0);
  const prevTotal = prevTxns.filter(t => donFilter === "80g" ? t._is80G : donFilter === "non80g" ? !t._is80G : true).reduce((s, t) => s + t._amount, 0);
  const growth = growthPct(total, prevTotal);
  const timeSeries = useMemo(() => groupByDate(txns, period), [txns, period]);
  const byCat = useMemo(() => topByField(txns, "_donationCategory"), [txns]);
  const topDonors = useMemo(() => topContributors(txns), [txns]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["all", "80g", "non80g"] as DonFilter[]).map(f => (
          <button key={f} onClick={() => setDonFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${donFilter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            data-testid={`don-filter-${f}`}>
            {f === "all" ? "All Donations" : f === "80g" ? "80G Only" : "Non-80G Only"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Collected" value={fmtCurr(total)} growth={growth} />
        <KpiCard label="Transactions" value={String(txns.length)} />
        <KpiCard label="Avg Donation" value={fmtCurr(txns.length ? Math.round(total / txns.length) : 0)} />
        <KpiCard label="Peak Day" value={peakDay || "—"} />
      </div>
      <SectionCard title="Donation Trend">
        <TimeBarChart data={timeSeries} period={period} />
      </SectionCard>
      <SectionCard title="By Category (Top 10 by ₹)">
        <HBar data={byCat.map(d => ({ name: d.name, amount: Math.round(d.amount) }))} />
      </SectionCard>
      <SectionCard title="Top Donors">
        <TopTable rows={topDonors} amtLabel="Total Donated" />
      </SectionCard>
    </div>
  );
}

function SevaSection({ txns, prevTxns, period, peakDay }: { txns: NormalizedTxn[]; prevTxns: NormalizedTxn[]; period: Period; peakDay: string | null }) {
  const total = txns.reduce((s, t) => s + t._amount, 0);
  const prevTotal = prevTxns.reduce((s, t) => s + t._amount, 0);
  const growth = growthPct(total, prevTotal);
  const timeSeries = useMemo(() => groupByDate(txns, period), [txns, period]);
  const byName = useMemo(() => topByField(txns, "_sevaName"), [txns]);
  const bySannidhi = useMemo(() => topByField(txns, "_type"), [txns]);
  const topDevotees = useMemo(() => topContributors(txns), [txns]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmtCurr(total)} growth={growth} />
        <KpiCard label="Bookings" value={String(txns.length)} />
        <KpiCard label="Avg per Booking" value={fmtCurr(txns.length ? Math.round(total / txns.length) : 0)} />
        <KpiCard label="Peak Day" value={peakDay || "—"} />
      </div>
      <SectionCard title="Seva Bookings Trend (₹ + Count)">
        <DualAxisChart data={timeSeries} />
      </SectionCard>
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="By Seva Name (Top 10)">
          <HBar data={byName.map(d => ({ name: d.name, amount: Math.round(d.amount) }))} />
        </SectionCard>
        <SectionCard title="By Sannidhi / Type (Top 10)">
          <HBar data={bySannidhi.map(d => ({ name: d.name, amount: Math.round(d.amount) }))} />
        </SectionCard>
      </div>
      <SectionCard title="Top Devotees by ₹">
        <TopTable rows={topDevotees} amtLabel="Total Seva ₹" countLabel="Bookings" />
      </SectionCard>
    </div>
  );
}

function AccommodationSection({ txns, period, peakDay }: { txns: NormalizedTxn[]; period: Period; peakDay: string | null }) {
  const total = txns.reduce((s, t) => s + t._amount, 0);
  const timeSeries = useMemo(() => groupByDate(txns, period), [txns, period]);
  const byBuilding = useMemo(() => topByField(txns, "_building"), [txns]);
  const topBookers = useMemo(() => topContributors(txns), [txns]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmtCurr(total)} />
        <KpiCard label="Bookings" value={String(txns.length)} />
        <KpiCard label="Avg per Booking" value={fmtCurr(txns.length ? Math.round(total / txns.length) : 0)} />
        <KpiCard label="Peak Day" value={peakDay || "—"} />
      </div>
      <SectionCard title="Accommodation Revenue Trend">
        <DualAxisChart data={timeSeries} />
      </SectionCard>
      {byBuilding.length > 0 && (
        <SectionCard title="By Building / Block">
          <HBar data={byBuilding.map(d => ({ name: d.name, amount: Math.round(d.amount) }))} />
        </SectionCard>
      )}
      <SectionCard title="Frequent Bookers">
        <TopTable rows={topBookers} amtLabel="Total Paid" countLabel="Stays" />
      </SectionCard>
    </div>
  );
}

function FastlineSection({ txns, period, peakDay }: { txns: NormalizedTxn[]; period: Period; peakDay: string | null }) {
  const total = txns.reduce((s, t) => s + t._amount, 0);
  const timeSeries = useMemo(() => groupByDate(txns, period), [txns, period]);
  const topBookers = useMemo(() => topContributors(txns), [txns]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmtCurr(total)} />
        <KpiCard label="Bookings" value={String(txns.length)} />
        <KpiCard label="Avg per Booking" value={fmtCurr(txns.length ? Math.round(total / txns.length) : 0)} />
        <KpiCard label="Peak Day" value={peakDay || "—"} />
      </div>
      <SectionCard title="Fastline Bookings Trend">
        <TimeBarChart data={timeSeries} period={period} />
      </SectionCard>
      <SectionCard title="Frequent Bookers">
        <TopTable rows={topBookers} amtLabel="Total Paid" countLabel="Bookings" />
      </SectionCard>
    </div>
  );
}

function SevaReport({ getToken }: { getToken: () => Promise<string | null> }) {
  const { toast } = useToast();
  const [rfrom, setRfrom] = useState(today());
  const [rto, setRto] = useState(today());
  const [allTxns, setAllTxns] = useState<NormalizedTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedSevas, setSelectedSevas] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sevaOptions = useMemo(() => Array.from(new Set(allTxns.filter(t => t._category === "seva").map(t => t._sevaName))).sort(), [allTxns]);

  async function fetchReport() {
    setLoading(true);
    setGenerated(false);
    setSelectedSevas(new Set());
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await fetchTxns(rfrom, rto, token);
      setAllTxns(data);
    } catch (e: any) {
      toast({ title: "Failed to fetch", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  const sevaTxns = useMemo(() => allTxns.filter(t => t._category === "seva"), [allTxns]);
  const summary = useMemo(() => {
    const map = new Map<string, { sevaName: string; count: number; amount: number; txns: NormalizedTxn[] }>();
    const toShow = selectedSevas.size > 0 ? sevaTxns.filter(t => selectedSevas.has(t._sevaName)) : sevaTxns;
    for (const t of toShow) {
      const k = t._sevaName;
      const prev = map.get(k) || { sevaName: k, count: 0, amount: 0, txns: [] };
      map.set(k, { ...prev, count: prev.count + 1, amount: prev.amount + t._amount, txns: [...prev.txns, t] });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [sevaTxns, selectedSevas]);

  const grandTotal = summary.reduce((s, r) => ({ count: s.count + r.count, amount: s.amount + r.amount }), { count: 0, amount: 0 });

  function exportCsv() {
    const rows: (string | number)[][] = [["Seva Name", "Count", "Total ₹", "Avg ₹", "Order ID", "Devotee", "Date", "Amount"]];
    for (const row of summary) {
      rows.push([row.sevaName, row.count, Math.round(row.amount), Math.round(row.amount / row.count), "", "", "", ""]);
      for (const t of row.txns) rows.push(["", "", "", "", t._orderId, t._name, t._date, t._amount]);
    }
    downloadCsv(rows, `seva-report-${rfrom}-${rto}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
        <h3 className="font-semibold text-sm">360° Seva Report</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">From Date</label>
            <input type="date" value={rfrom} onChange={e => setRfrom(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" data-testid="input-seva-report-from" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">To Date</label>
            <input type="date" value={rto} onChange={e => setRto(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" data-testid="input-seva-report-to" /></div>
        </div>
        <Button onClick={fetchReport} disabled={loading || !rfrom || !rto} data-testid="button-fetch-seva-report">
          {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : null}
          {loading ? "Loading…" : "Fetch Seva Transactions"}
        </Button>
      </div>

      {sevaTxns.length > 0 && !loading && (
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Filter by Seva Name ({sevaOptions.length} found)</label>
            <MultiSelect options={sevaOptions} selected={selectedSevas} onChange={setSelectedSevas} placeholder="All sevas" /></div>
          <div className="flex gap-2">
            <Button onClick={() => setGenerated(true)} data-testid="button-generate-seva-report">Generate Report</Button>
            {generated && <Button variant="outline" size="sm" onClick={exportCsv} data-testid="button-export-seva-csv">
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>}
          </div>
        </div>
      )}

      {generated && summary.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-seva-report">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-8"></th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Seva Name</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Count</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Total ₹</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Avg ₹</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(row => (
                  <Fragment key={row.sevaName}>
                    <tr className="border-b hover:bg-muted/10 cursor-pointer" onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(row.sevaName) ? n.delete(row.sevaName) : n.add(row.sevaName); return n; })} data-testid={`row-seva-${row.sevaName}`}>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {expanded.has(row.sevaName) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{row.sevaName}</td>
                      <td className="px-3 py-2.5 text-right">{row.count}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{fmtCurr(Math.round(row.amount))}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtCurr(Math.round(row.amount / row.count))}</td>
                    </tr>
                    {expanded.has(row.sevaName) && row.txns.map((t, i) => (
                      <tr key={t._orderId || i} className="bg-muted/5 border-b text-xs">
                        <td className="px-3 py-1.5"></td>
                        <td className="px-3 py-1.5 pl-8 text-muted-foreground">{t._name || "—"}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{t._date}</td>
                        <td className="px-3 py-1.5 text-right">{fmtCurr(t._amount)}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground font-mono text-[10px] truncate max-w-[100px]">{t._orderId}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="bg-primary/5 font-semibold">
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right">{grandTotal.count}</td>
                  <td className="px-3 py-2.5 text-right text-primary">{fmtCurr(Math.round(grandTotal.amount))}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{grandTotal.count ? fmtCurr(Math.round(grandTotal.amount / grandTotal.count)) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generated && summary.length === 0 && <NoData msg="No seva transactions found for the selected range and sevas" />}
    </div>
  );
}

function DonationReport({ getToken }: { getToken: () => Promise<string | null> }) {
  const { toast } = useToast();
  const [rfrom, setRfrom] = useState(today());
  const [rto, setRto] = useState(today());
  const [allTxns, setAllTxns] = useState<NormalizedTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [donFilter, setDonFilter] = useState<DonFilter>("all");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const donTxns = useMemo(() => {
    const base = allTxns.filter(t => t._category === "donation");
    if (donFilter === "80g") return base.filter(t => t._is80G);
    if (donFilter === "non80g") return base.filter(t => !t._is80G);
    return base;
  }, [allTxns, donFilter]);

  const catOptions = useMemo(() => Array.from(new Set(donTxns.map(t => t._donationCategory))).sort(), [donTxns]);

  async function fetchReport() {
    setLoading(true);
    setGenerated(false);
    setSelectedCats(new Set());
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await fetchTxns(rfrom, rto, token);
      setAllTxns(data);
    } catch (e: any) {
      toast({ title: "Failed to fetch", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  const summary = useMemo(() => {
    const map = new Map<string, { catName: string; count: number; amount: number; txns: NormalizedTxn[] }>();
    const toShow = selectedCats.size > 0 ? donTxns.filter(t => selectedCats.has(t._donationCategory)) : donTxns;
    for (const t of toShow) {
      const k = t._donationCategory;
      const prev = map.get(k) || { catName: k, count: 0, amount: 0, txns: [] };
      map.set(k, { ...prev, count: prev.count + 1, amount: prev.amount + t._amount, txns: [...prev.txns, t] });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [donTxns, selectedCats]);

  const grandTotal = summary.reduce((s, r) => ({ count: s.count + r.count, amount: s.amount + r.amount }), { count: 0, amount: 0 });

  function exportCsv() {
    const rows: (string | number)[][] = [["Category", "80G", "Count", "Total ₹", "Avg ₹", "Order ID", "Donor", "Date", "Amount"]];
    for (const row of summary) {
      rows.push([row.catName, "", row.count, Math.round(row.amount), Math.round(row.amount / row.count), "", "", "", ""]);
      for (const t of row.txns) rows.push(["", t._is80G ? "Yes" : "No", "", "", "", t._orderId, t._name, t._date, t._amount]);
    }
    downloadCsv(rows, `donation-report-${rfrom}-${rto}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
        <h3 className="font-semibold text-sm">360° Donation Report</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">From Date</label>
            <input type="date" value={rfrom} onChange={e => setRfrom(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" data-testid="input-don-report-from" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">To Date</label>
            <input type="date" value={rto} onChange={e => setRto(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" data-testid="input-don-report-to" /></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "80g", "non80g"] as DonFilter[]).map(f => (
            <button key={f} onClick={() => setDonFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${donFilter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`} data-testid={`don-report-filter-${f}`}>
              {f === "all" ? "All" : f === "80g" ? "80G" : "Non-80G"}
            </button>
          ))}
        </div>
        <Button onClick={fetchReport} disabled={loading || !rfrom || !rto} data-testid="button-fetch-don-report">
          {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : null}
          {loading ? "Loading…" : "Fetch Donation Transactions"}
        </Button>
      </div>

      {donTxns.length > 0 && !loading && (
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Filter by Category ({catOptions.length} found)</label>
            <MultiSelect options={catOptions} selected={selectedCats} onChange={setSelectedCats} placeholder="All categories" /></div>
          <div className="flex gap-2">
            <Button onClick={() => setGenerated(true)} data-testid="button-generate-don-report">Generate Report</Button>
            {generated && <Button variant="outline" size="sm" onClick={exportCsv} data-testid="button-export-don-csv">
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>}
          </div>
        </div>
      )}

      {generated && summary.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-donation-report">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-8"></th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Category</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Count</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Total ₹</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Avg ₹</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(row => (
                  <Fragment key={row.catName}>
                    <tr className="border-b hover:bg-muted/10 cursor-pointer" onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(row.catName) ? n.delete(row.catName) : n.add(row.catName); return n; })} data-testid={`row-don-${row.catName}`}>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {expanded.has(row.catName) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{row.catName}</td>
                      <td className="px-3 py-2.5 text-right">{row.count}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{fmtCurr(Math.round(row.amount))}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtCurr(Math.round(row.amount / row.count))}</td>
                    </tr>
                    {expanded.has(row.catName) && row.txns.map((t, i) => (
                      <tr key={t._orderId || i} className="bg-muted/5 border-b text-xs">
                        <td className="px-3 py-1.5"></td>
                        <td className="px-3 py-1.5 pl-8 text-muted-foreground">{t._name || "—"} {t._is80G && <span className="ml-1 bg-green-100 text-green-700 px-1 rounded text-[10px]">80G</span>}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{t._date}</td>
                        <td className="px-3 py-1.5 text-right">{fmtCurr(t._amount)}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground font-mono text-[10px] truncate max-w-[100px]">{t._orderId}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="bg-primary/5 font-semibold">
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right">{grandTotal.count}</td>
                  <td className="px-3 py-2.5 text-right text-primary">{fmtCurr(Math.round(grandTotal.amount))}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{grandTotal.count ? fmtCurr(Math.round(grandTotal.amount / grandTotal.count)) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generated && summary.length === 0 && <NoData msg="No donation transactions found for the selected range and categories" />}
    </div>
  );
}
