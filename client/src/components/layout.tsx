import { Link, useLocation } from "wouter";
import { Home, Calendar, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Services", path: "/home" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Users, label: "Devotee", path: "/devotee" },
    { icon: User, label: "Account", path: "/profile" },
  ];

  // Hide nav on login page
  if (location === "/") return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-border/40">
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {children}
      </div>

      <nav className="fixed bottom-0 w-full max-w-md bg-white/80 backdrop-blur-md border-t border-border z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <a className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                )}>
                  <item.icon className={cn("h-6 w-6", isActive && "fill-current/20")} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
