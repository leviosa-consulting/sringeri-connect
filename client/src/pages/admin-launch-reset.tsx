import { useState, useEffect } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { RotateCcw, ShieldAlert, Loader2, LogIn, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIdToken, loginWithEmail } from "@/lib/firebase";

const ADMIN_UIDS = (import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(",").map((s: string) => s.trim()).filter(Boolean);

export default function AdminLaunchReset() {
  const { user, loading: authLoading } = useAuth();
  const [isLaunched, setIsLaunched] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    fetch("/api/launch-status")
      .then(r => r.json())
      .then(data => setIsLaunched(!!data.isLaunched))
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, []);

  if (authLoading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EC]">
        <RangoliLoader size={64} />
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
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required data-testid="input-reset-email" />
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required data-testid="input-reset-password" />
          <Button type="submit" disabled={loginLoading} className="w-full" data-testid="button-reset-login">
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
      </div>
    );
  }

  const handleReset = async () => {
    setResetting(true);
    setError("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/launch/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Reset failed");
      setResetDone(true);
      setIsLaunched(false);
    } catch (err: any) {
      setError(err.message || "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF8F0] via-[#F7F2EC] to-[#EDE4D8] px-6 text-center">
      <img src="/assets/logo.webp" alt="Sringeri" className="h-20 w-auto object-contain mb-8 drop-shadow-md" />

      {resetDone ? (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-serif font-bold text-foreground">Reset Complete</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            The app is back in Coming Soon mode. Visit <span className="font-mono text-xs">/admin/launch</span> to inaugurate again.
          </p>
          <Button onClick={() => window.location.href = "/admin/launch"} className="mt-4" data-testid="button-go-to-launch">
            Go to Launch Page
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-w-sm">
          <RotateCcw className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h1 className="text-xl font-serif font-bold text-foreground">Reset Launch Status</h1>
          <p className="text-sm text-muted-foreground">
            {isLaunched
              ? "The app is currently live. Resetting will put it back into Coming Soon mode for all visitors."
              : "The app is already in Coming Soon mode. No reset needed."}
          </p>

          {isLaunched && (
            <Button
              onClick={handleReset}
              disabled={resetting}
              variant="destructive"
              className="mt-4"
              data-testid="button-confirm-reset"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Reset to Coming Soon
            </Button>
          )}

          {!isLaunched && (
            <Button onClick={() => window.location.href = "/admin/launch"} className="mt-4" data-testid="button-go-to-launch">
              Go to Launch Page
            </Button>
          )}

          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
