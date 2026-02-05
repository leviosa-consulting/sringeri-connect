import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [_, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setLocation("/home");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[url('/assets/temple-hero.jpg')] bg-cover bg-center flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <Card className="w-full max-w-sm relative z-10 border-none shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="mx-auto flex items-center justify-center pt-4">
             <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-16 w-auto object-contain" />
          </div>
          <CardDescription className="text-base font-medium text-primary/80">Sign in to access Seva & Services</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="Email Address" 
                className="bg-white/50 border-primary/20 focus:border-primary focus:ring-primary/20"
                defaultValue="devotee@sringeri.net"
              />
            </div>
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Password" 
                className="bg-white/50 border-primary/20 focus:border-primary focus:ring-primary/20"
                defaultValue="password123"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
            
            <div className="text-center text-xs text-muted-foreground mt-4">
              By continuing, you agree to our Terms of Service & Privacy Policy
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
