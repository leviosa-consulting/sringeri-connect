import { useAuth } from "@/contexts/auth-context";
import { RangoliLoader } from "@/components/rangoli-loader";
import { BarChart3, BookOpenCheck, Brain, Rocket, ArrowLeft, RefreshCw, ScrollText, MessageSquare, ClipboardList, TrendingUp, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const adminTools = [
  {
    title: "App Analytics",
    description: "View page visits, clicks, scroll depth, and user engagement metrics",
    icon: BarChart3,
    path: "/analytics",
    color: "bg-blue-50 text-blue-600",
    role: "analytics",
  },
  {
    title: "Quiz Management",
    description: "Create, edit, and manage daily Knowledge Corner quizzes",
    icon: BookOpenCheck,
    path: "/admin/quizzes",
    color: "bg-green-50 text-green-600",
    role: "quiz",
  },
  {
    title: "Quiz Analytics",
    description: "View quiz participation, scores, and user performance data",
    icon: Brain,
    path: "/admin/quiz-analytics",
    color: "bg-purple-50 text-purple-600",
    role: "quiz",
  },
  {
    title: "Transaction Reconciliation",
    description: "Verify pending Paytm payments and send acknowledgements to complete receipts",
    icon: RefreshCw,
    path: "/admin/reconciliation",
    color: "bg-amber-50 text-amber-600",
    role: "accounts",
  },
  {
    title: "All Transactions",
    description: "View all transactions — successful, pending, and failed — for any date range",
    icon: ScrollText,
    path: "/admin/all-transactions",
    color: "bg-teal-50 text-teal-600",
    role: "accounts",
  },
  {
    title: "Reconciliation Logs",
    description: "Audit trail of automated payment reconciliation runs — every 15 minutes",
    icon: ClipboardList,
    path: "/admin/reconciliation-logs",
    color: "bg-indigo-50 text-indigo-600",
    role: "accounts",
  },
  {
    title: "Support & Feedback",
    description: "View and reply to support requests and feedback submitted by devotees",
    icon: MessageSquare,
    path: "/admin/support",
    color: "bg-rose-50 text-rose-600",
    role: "support",
  },
  {
    title: "Revenue & Stats",
    description: "Period-based revenue charts, category breakdowns, top contributors, and 360° Seva/Donation reports",
    icon: TrendingUp,
    path: "/admin/stats",
    color: "bg-emerald-50 text-emerald-600",
    role: "accounts",
  },
  {
    title: "Launch Control",
    description: "Toggle the app's public availability (Coming Soon gate)",
    icon: Rocket,
    path: "/admin/launch",
    color: "bg-orange-50 text-orange-600",
    role: "super_admin",
  },
  {
    title: "Role Management",
    description: "Grant or revoke admin roles for users of this portal",
    icon: ShieldCheck,
    path: "/admin/roles",
    color: "bg-slate-50 text-slate-600",
    role: "super_admin",
  },
];

export default function Admin() {
  const { loading: authLoading, hasAdminRole } = useAuth();
  const isAnyAdmin = adminTools.some(t => hasAdminRole(t.role));

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RangoliLoader size={64} data-testid="loading-spinner" />
      </div>
    );
  }

  if (!isAnyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2" data-testid="text-access-denied">
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground/60">This page is only for authorized administrators.</p>
        </div>
      </div>
    );
  }

  const visibleTools = adminTools.filter(t => hasAdminRole(t.role));

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-6 max-w-3xl mx-auto" data-testid="admin-hub-page">
      <div className="flex items-center gap-3">
        <Link href="/home" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-home">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your app and view analytics</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleTools.map((tool) => (
          <Link
            key={tool.path}
            href={tool.path}
            className="block p-5 bg-card rounded-xl border border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
            data-testid={`link-admin-${tool.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${tool.color} transition-transform group-hover:scale-110`}>
                <tool.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">{tool.title}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{tool.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
