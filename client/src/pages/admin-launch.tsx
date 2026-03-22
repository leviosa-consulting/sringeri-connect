import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ShieldAlert, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIdToken, loginWithEmail } from "@/lib/firebase";

const ADMIN_UIDS = (import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(",").map((s: string) => s.trim()).filter(Boolean);

export default function AdminLaunch() {
  const { user, loading: authLoading } = useAuth();
  const [launching, setLaunching] = useState(false);
  const [alreadyLaunched, setAlreadyLaunched] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    fetch("/api/launch-status")
      .then(r => r.json())
      .then(data => {
        if (data.isLaunched) setAlreadyLaunched(true);
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, []);

  if (authLoading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EC]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginLoading(true);
      setLoginError("");
      try {
        await loginWithEmail(email, password);
      } catch (err: any) {
        setLoginError(err.message || "Login failed");
      } finally {
        setLoginLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF8F0] via-[#F7F2EC] to-[#EDE4D8] px-6">
        <img src="/assets/logo.webp" alt="Sringeri" className="h-20 w-auto object-contain mb-6 drop-shadow-md" />
        <p className="text-sm text-muted-foreground mb-6 font-medium">Admin sign in required</p>
        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            data-testid="input-admin-email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            data-testid="input-admin-password"
          />
          <Button type="submit" disabled={loginLoading} className="w-full" data-testid="button-admin-login">
            {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
            Sign In
          </Button>
          {loginError && <p className="text-xs text-destructive text-center">{loginError}</p>}
        </form>
      </div>
    );
  }

  if (!ADMIN_UIDS.includes(user.uid)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F2EC] px-6 text-center gap-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/40" />
        <p className="text-lg text-muted-foreground font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground/60">This page is only for authorized administrators.</p>
      </div>
    );
  }

  if (alreadyLaunched) {
    window.location.href = "/";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EC]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLaunch = async () => {
    setLaunching(true);
    setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Launch failed");
      }

      window.location.href = "/";
      return;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF8F0] via-[#F7F2EC] to-[#EDE4D8] px-6 text-center relative overflow-hidden" data-testid="admin-launch-page">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23996633' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="relative z-10">
        <img
          src="/assets/logo.webp"
          alt="Sri Sringeri Sharada Peetham"
          className="h-28 w-auto object-contain mx-auto mb-6 drop-shadow-lg"
        />

        <p className="text-sm text-primary/50 italic mb-4" style={{ fontFamily: "'Noto Serif Devanagari', serif" }}>
          {"श्री गुरुभ्यो नमः"}
        </p>

        <h1 className="text-xl font-serif font-bold text-foreground mb-2">Devotee Services Portal</h1>

        <div className="flex items-center justify-center gap-3 my-5">
          <div className="w-10 h-px bg-gradient-to-r from-transparent to-primary/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-10 h-px bg-gradient-to-l from-transparent to-primary/30" />
        </div>

        <p className="text-sm text-muted-foreground mb-10 max-w-xs mx-auto leading-relaxed">
          With the blessings of the Jagadguru, inaugurate the devotee services portal by pressing the button below.
        </p>

        {!confirmStep ? (
          <div className="space-y-4">
            <button
              onClick={() => setConfirmStep(true)}
              className="group relative mx-auto block"
              data-testid="button-launch-init"
            >
              <div className="absolute -inset-3 bg-gradient-to-br from-primary/20 to-amber-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse" />
              <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-orange-300/40 transition-all duration-300 group-hover:scale-105 group-active:scale-95 ring-4 ring-white/80">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313-12.454Z M12 8v4l3 3" />
                </svg>
              </div>
            </button>
            <p className="text-xs text-muted-foreground/60 font-medium">Tap to inaugurate</p>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-primary/10 p-5 max-w-xs mx-auto space-y-3">
              <p className="text-sm font-serif font-semibold text-foreground">Ready to open the portal?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will make the app available to all devotees immediately.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleLaunch}
                disabled={launching}
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white px-8 shadow-lg text-base h-12"
                data-testid="button-launch-confirm"
              >
                {launching && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {launching ? "Opening..." : "Open the Portal"}
              </Button>
              <Button
                onClick={() => setConfirmStep(false)}
                variant="outline"
                className="h-12"
                data-testid="button-launch-cancel"
              >
                Not yet
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive" data-testid="text-launch-error">{error}</p>
        )}
      </div>
    </div>
  );
}
