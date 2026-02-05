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
        className="group relative overflow-hidden bg-card rounded-2xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-3 text-center aspect-square"
      >
        <div className={cn("p-4 rounded-xl shrink-0 transition-transform group-hover:scale-110 duration-500", color)}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-1 w-full">
          <h3 className="font-serif font-bold text-sm text-foreground leading-tight">{title}</h3>
          {isExternal && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50 absolute top-3 right-3" />}
        </div>
        
        {/* Decorative accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
