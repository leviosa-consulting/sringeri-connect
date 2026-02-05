import { Link, useLocation } from "wouter";
import { Home, Calendar, Users, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function DesktopNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Services", path: "/home" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Users, label: "Devotee Corner", path: "/devotee" },
    { icon: User, label: "My Account", path: "/profile" },
  ];

  return (
    <nav className="hidden md:block sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home">
            <a className="flex items-center gap-3">
              <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-12 w-auto object-contain" />
            </a>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <a className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              </Link>
            );
          })}
          <div className="pl-6 border-l">
            <Link href="/">
               <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                 <LogOut className="h-4 w-4 mr-2" />
                 Sign Out
               </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
