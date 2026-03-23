import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [_, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { login, signUp, signInWithGoogle, signInWithApple, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setLocation("/home");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast({
            title: "Passwords don't match",
            description: "Please make sure your passwords match.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast({
            title: "Password too short",
            description: "Password must be at least 6 characters.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
        toast({
          title: "Account created",
          description: "Welcome to Sringeri Digital Services!",
        });
      } else {
        await login(email, password);
      }
      setLocation("/home");
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "Something went wrong. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        message = "This email is already registered. Please sign in.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        message = "Invalid email or password.";
      }
      toast({
        title: isSignUp ? "Sign Up Failed" : "Login Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      setLocation("/home");
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Google Sign-In Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
      setLocation("/home");
    } catch (error: any) {
      if (error?.message?.includes('cancelled')) {
        console.log("Apple sign-in cancelled by user");
      } else {
        console.error("Apple sign-in error:", error);
        toast({
          title: "Apple Sign-In Failed",
          description: error.message || "Could not sign in with Apple. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const anyLoading = loading || googleLoading || appleLoading;

  return (
    <div className="min-h-screen bg-[url('/assets/temple-hero.jpg')] bg-cover bg-center flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <Card className="w-full max-w-sm relative z-10 border-none shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="mx-auto flex items-center justify-center pt-4">
             <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-16 w-auto object-contain" />
          </div>
          <CardDescription className="text-base font-medium text-primary/80">
            {isSignUp ? "Create your account" : "Sign in to access Seva & Services"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!/android/i.test(navigator.userAgent) && (
            <Button 
              type="button"
              className="w-full h-12 font-medium bg-black text-white hover:bg-black/90 border-0"
              onClick={handleAppleSignIn}
              disabled={anyLoading}
              data-testid="button-apple-signin"
            >
              {appleLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Sign in with Apple
            </Button>
          )}

          <Button 
            type="button"
            variant="outline" 
            className="w-full h-12 font-medium border-2 hover:bg-gray-50"
            onClick={handleGoogleSignIn}
            disabled={anyLoading}
            data-testid="button-google-signin"
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input 
                type="text" 
                placeholder="Full Name" 
                className="bg-white/50 border-primary/20 focus:border-primary focus:ring-primary/20"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                data-testid="input-name"
              />
            )}
            <Input 
              type="email" 
              placeholder="Email Address" 
              className="bg-white/50 border-primary/20 focus:border-primary focus:ring-primary/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
            <Input 
              type="password" 
              placeholder="Password" 
              className="bg-white/50 border-primary/20 focus:border-primary focus:ring-primary/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="input-password"
            />
            {isSignUp && (
              <Input 
                type="password" 
                placeholder="Confirm Password" 
                className="bg-white/50 border-primary/20 focus:border-primary focus:ring-primary/20"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                data-testid="input-confirm-password"
              />
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6"
              disabled={anyLoading}
              data-testid="button-submit"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </form>

          <div className="text-center">
            <button 
              type="button"
              className="text-sm text-primary hover:underline font-medium"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
                setConfirmPassword("");
              }}
              data-testid="button-toggle-mode"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service & Privacy Policy
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
