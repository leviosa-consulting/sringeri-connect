import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RangoliLoader } from "@/components/rangoli-loader";
import { BarChart3, BookOpenCheck, Brain, Rocket, ArrowLeft, RefreshCw, ScrollText, MessageSquare, ClipboardList, TrendingUp, ShieldCheck, Loader2, ChevronDown, ChevronUp, Eye, EyeOff, FileEdit } from "lucide-react";
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
    title: "Corrections / Rectifications",
    description: "Search a seva, donation, yatri, or fastline record to review and correct its details",
    icon: FileEdit,
    path: "/admin/corrections",
    color: "bg-cyan-50 text-cyan-600",
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
  const { user, loading: authLoading, hasAdminRole, login, signInWithGoogle, signInWithApple } = useAuth();
  const isAnyAdmin = adminTools.some(t => hasAdminRole(t.role));

  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RangoliLoader size={64} data-testid="loading-spinner" />
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EC] px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-14 w-auto object-contain" />
            <div className="text-center">
              <h1 className="text-lg font-bold text-foreground">Admin Sign In</h1>
              <p className="text-sm text-muted-foreground mt-1">Sri Sringeri Sharada Peetham</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700" data-testid="text-signin-error">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {!/android/i.test(navigator.userAgent) && (
              <button
                type="button"
                className="w-full h-12 flex items-center justify-center gap-2 rounded-lg font-medium text-sm bg-black text-white hover:bg-black/90 disabled:opacity-60 transition-colors"
                onClick={async () => {
                  setError("");
                  setAppleLoading(true);
                  try { await signInWithApple(); }
                  catch (e: any) {
                    if (!e?.message?.includes("cancelled")) setError(e?.message || "Apple Sign-In failed. Please try again.");
                  }
                  finally { setAppleLoading(false); }
                }}
                disabled={appleLoading || googleLoading || emailLoading}
                data-testid="button-apple-signin"
              >
                {appleLoading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                }
                Sign in with Apple
              </button>
            )}

            <button
              type="button"
              className="w-full h-12 flex items-center justify-center gap-2 rounded-lg font-medium text-sm border-2 border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 transition-colors"
              onClick={async () => {
                setError("");
                setGoogleLoading(true);
                try { await signInWithGoogle(); }
                catch (e: any) {
                  if (!e?.message?.includes("cancelled")) setError(e?.message || "Google Sign-In failed. Please try again.");
                }
                finally { setGoogleLoading(false); }
              }}
              disabled={appleLoading || googleLoading || emailLoading}
              data-testid="button-google-signin"
            >
              {googleLoading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              }
              Continue with Google
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <button
              type="button"
              className="w-full h-12 flex items-center justify-center gap-2 rounded-lg font-medium text-sm border border-primary/40 text-primary hover:bg-primary/5 transition-colors"
              onClick={() => setEmailOpen(o => !o)}
              data-testid="button-email-toggle"
            >
              Sign in with Email
              {emailOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {emailOpen && (
              <form
                className="space-y-3 pt-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  setEmailLoading(true);
                  try { await login(email, password); }
                  catch (e: any) { setError(e?.message || "Sign-in failed. Check your email and password."); }
                  finally { setEmailLoading(false); }
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="input-email"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full border border-border rounded-md px-3 py-2.5 pr-10 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={emailLoading || !email || !password}
                  className="w-full h-11 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  data-testid="button-email-signin"
                >
                  {emailLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Sign In"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isAnyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2" data-testid="text-access-denied">
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground/60">
            Signed in as <span className="font-medium">{user.email || user.displayName}</span>, but this account has no admin roles.
          </p>
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
