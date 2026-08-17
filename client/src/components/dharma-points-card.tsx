import { useQuery } from "@tanstack/react-query";
import { Flower2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { dailyPointsQuery, type DharmaSummary } from "@/lib/daily";
import { cn } from "@/lib/utils";

interface DharmaPointsCardProps {
  onClick?: () => void;
  className?: string;
  /** Compact variant used inside the profile header area. */
  compact?: boolean;
}

export default function DharmaPointsCard({ onClick, className, compact }: DharmaPointsCardProps) {
  const { user, getToken } = useAuth();
  const { data } = useQuery<DharmaSummary>({
    ...dailyPointsQuery(getToken),
    enabled: !!user,
  });

  if (!user || !data) return null;

  const body = (
    <>
      <div className="w-10 h-10 rounded-full bg-[#ff6600]/10 flex items-center justify-center shrink-0">
        <Flower2 className="w-5 h-5 text-[#ff6600]" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-baseline gap-2">
          <span className="font-serif font-bold text-xl leading-none" data-testid="text-dharma-total">{data.total}</span>
          <span className="text-sm font-medium text-foreground/70">Dharma Points</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {data.today > 0
            ? `You have earned ${data.today} ${data.today === 1 ? "point" : "points"} today.`
            : "Open Today to earn points from your daily practice."}
        </p>
      </div>
    </>
  );

  const classes = cn(
    "w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50",
    compact && "p-3",
    onClick && "hover:border-primary/40 hover:shadow-md transition-all",
    className
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={classes} data-testid="card-dharma-points">
        {body}
      </button>
    );
  }

  return (
    <div className={classes} data-testid="card-dharma-points">
      {body}
    </div>
  );
}
