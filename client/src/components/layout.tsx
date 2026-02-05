import { Link, useLocation } from "wouter";
import { Home, Calendar, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import DesktopNav from "./desktop-nav";
import ChatbotWidget from "./chatbot-widget";
import { useMedia } from "react-use";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isDesktop = useMedia('(min-width: 768px)', false);

  const navItems = [
    { icon: Home, label: "Services", path: "/home" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Users, label: "Devotee", path: "/devotee" },
    { icon: User, label: "Account", path: "/profile" },
  ];

  // Hide nav on login page
  if (location === "/") return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col relative w-full overflow-x-hidden">
      
      {/* Conditionally Render Navigation */}
      {isDesktop ? (
        <DesktopNav />
      ) : (
        /* Mobile Top Bar (Logo Only) - since Nav is at bottom */
        <div className="md:hidden h-16 bg-background/80 backdrop-blur border-b sticky top-0 z-40 flex items-center justify-center px-4">
          <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-10 object-contain" />
        </div>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 w-full mx-auto",
        isDesktop ? "max-w-7xl px-6 py-8" : "max-w-lg pb-20"
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!isDesktop && (
        <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-border z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <a className={cn(
                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                  )}>
                    <item.icon className={cn("h-6 w-6", isActive && "fill-current/20 scale-110 transition-transform")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Chatbot is available on both views */}
      <ChatbotWidget />
    </div>
  );
}
