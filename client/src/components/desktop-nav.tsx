import { Link, useLocation } from "wouter";
import { Home, Bell, Users, User, LogOut, BookOpenCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import FontSizeToggle from "./font-size-toggle";

export default function DesktopNav() {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Bell, label: "Updates", path: "/updates" },
    { icon: Users, label: "Devotee Corner", path: "/devotee" },
    { icon: BookOpenCheck, label: "Knowledge", path: "/knowledge" },
    { icon: User, label: "My Account", path: "/profile" },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <nav className="hidden lg:block sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="flex items-center gap-3">
            <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
              </Link>
            );
          })}
          <FontSizeToggle />
          <div className="pl-6 border-l">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
