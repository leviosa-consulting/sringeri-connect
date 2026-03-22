import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Rocket, CheckCircle2, ShieldAlert, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIdToken, loginWithEmail } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";

const ADMIN_UIDS = (import.meta.env.VITE_ANALYTICS_ADMIN_UIDS || "").split(",").map((s: string) => s.trim()).filter(Boolean);

export default function AdminLaunch() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF8F0] via-[#F7F2EC] to-[#F0E8DC] px-6">
        <img src="/assets/logo.webp" alt="Sringeri" className="h-16 w-auto object-contain mb-6" />
        <p className="text-sm text-muted-foreground mb-6">Admin sign in required</p>
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
        <ShieldAlert className="w-16 h-16 text-muted-foreground/40" />
        <p className="text-lg text-muted-foreground font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground/60">This page is only for authorized administrators.</p>
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

      setLaunched(true);
      queryClient.invalidateQueries({ queryKey: ["/api/launch-status"] });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLaunching(false);
    }
  };

  if (launched) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-emerald-50 px-6 text-center gap-6" data-testid="launch-success">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-green-900">App Launched!</h1>
        <p className="text-green-700 max-w-sm">
          The app is now live. All visitors will see the full application.
        </p>
        <Button
          onClick={() => window.location.href = "/home"}
          className="mt-4 bg-green-600 hover:bg-green-700"
          data-testid="button-go-to-app"
        >
          Go to App
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF8F0] via-[#F7F2EC] to-[#F0E8DC] px-6 text-center" data-testid="admin-launch-page">
      <img
        src="/assets/logo.webp"
        alt="Sri Sringeri Sharada Peetham"
        className="h-24 w-auto object-contain mx-auto mb-8 drop-shadow-md"
      />

      <h1 className="text-2xl font-serif font-bold text-foreground mb-2">App Launch Control</h1>
      <p className="text-sm text-muted-foreground mb-10 max-w-xs">
        Press the button below to make the app available to all devotees.
      </p>

      {!confirmStep ? (
        <Button
          onClick={() => setConfirmStep(true)}
          className="h-20 w-20 rounded-full bg-gradient-to-br from-primary via-orange-500 to-amber-500 hover:from-primary/90 hover:via-orange-500/90 hover:to-amber-500/90 shadow-xl shadow-orange-200/60 text-white transition-all hover:scale-105 active:scale-95"
          data-testid="button-launch-init"
        >
          <Rocket className="w-8 h-8" />
        </Button>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          <p className="text-sm font-medium text-foreground">Are you sure? This will open the app to everyone.</p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleLaunch}
              disabled={launching}
              className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white px-8 shadow-lg"
              data-testid="button-launch-confirm"
            >
              {launching ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              {launching ? "Launching..." : "Launch Now"}
            </Button>
            <Button
              onClick={() => setConfirmStep(false)}
              variant="outline"
              data-testid="button-launch-cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-destructive" data-testid="text-launch-error">{error}</p>
      )}
    </div>
  );
}
