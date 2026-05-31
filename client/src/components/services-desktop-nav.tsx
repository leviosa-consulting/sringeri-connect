import { Link, useLocation } from "wouter";
import { Flame, Heart, Hotel, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import FontSizeToggle from "./font-size-toggle";
import { SERVICE_ROUTES, SERVICE_LABELS, type ServiceMode } from "@/contexts/subdomain-mode-context";

const SERVICE_ICONS: Record<NonNullable<ServiceMode>, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  seva: Flame,
  donate: Heart,
  yatri: Hotel,
};

const SERVICES: NonNullable<ServiceMode>[] = ["seva", "donate", "yatri"];

export default function ServicesDesktopNav() {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <nav className="hidden lg:block sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={SERVICE_ROUTES["seva"]} className="flex items-center gap-3">
            <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {SERVICES.map((svc) => {
            const Icon = SERVICE_ICONS[svc];
            const path = SERVICE_ROUTES[svc];
            const isActive = location === path || location.startsWith(path + "/");
            return (
              <Link
                key={svc}
                href={path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors hover:text-primary hover:bg-primary/5",
                  isActive ? "text-primary bg-primary/8" : "text-muted-foreground"
                )}
                data-testid={`nav-service-${svc}`}
              >
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                {SERVICE_LABELS[svc]}
              </Link>
            );
          })}

          <div className="mx-4 h-6 w-px bg-border" />

          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:text-primary hover:bg-primary/5",
              location === "/profile" ? "text-primary bg-primary/8" : "text-muted-foreground"
            )}
            data-testid="nav-service-account"
          >
            <User className="h-4 w-4" />
            Account
          </Link>

          <FontSizeToggle />

          <div className="pl-2 border-l ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              data-testid="nav-service-signout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
