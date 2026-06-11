import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [oobCode, setOobCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Firebase puts `oobCode` in the URL; also handle `mode` param Firebase uses
    const code = params.get("oobCode") || "";
    if (!code) setCodeError(true);
    setOobCode(code);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are identical.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/confirm-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oobCode, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Reset failed", description: data.error || "This link may have expired. Please request a new one.", variant: "destructive" });
        return;
      }
      setDone(true);
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F2EC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="bg-[#FF6600] px-6 py-5 text-center">
          <p className="text-white/80 text-xs uppercase tracking-widest font-serif">Sri Sringeri Sharada Peetham</p>
          <h1 className="text-white text-xl font-bold font-serif mt-1">Sringeri App</h1>
        </div>
        <div className="px-6 py-8">
          {codeError ? (
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Invalid link</h2>
              <p className="text-sm text-muted-foreground mb-6">This password reset link is invalid or missing. Please request a new one from the login page.</p>
              <Button className="w-full" onClick={() => setLocation("/")}>Back to login</Button>
            </div>
          ) : done ? (
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Password updated!</h2>
              <p className="text-sm text-muted-foreground mb-6">Your password has been changed. You can now log in with your new password.</p>
              <Button className="w-full" onClick={() => setLocation("/")}>Go to login</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <KeyRound className="h-5 w-5 text-[#FF6600]" />
                <h2 className="text-lg font-semibold font-serif">Set new password</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground/80 block mb-1">New password</label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground/80 block mb-1">Confirm password</label>
                  <Input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading} data-testid="button-reset-submit">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating…</> : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
