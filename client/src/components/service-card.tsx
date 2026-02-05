import { cn } from "@/lib/utils";
import { LucideIcon, ExternalLink } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  isExternal?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function ServiceCard({ title, description, icon: Icon, color, isExternal, onClick, compact }: ServiceCardProps) {
  if (compact) {
    return (
      <div 
        onClick={onClick}
        className="group flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
      >
        <div className={cn("h-14 w-14 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-300", color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex flex-col items-center gap-1 w-full px-1">
          <h3 className="font-sans font-medium text-[11px] text-foreground text-center leading-tight line-clamp-2">{title}</h3>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden bg-card rounded-xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-98"
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-lg shrink-0 transition-transform group-hover:scale-110 duration-500", color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif font-bold text-base text-foreground truncate">{title}</h3>
            {isExternal && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50" />}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-xl group-hover:from-primary/10 transition-colors" />
    </div>
  );
}
