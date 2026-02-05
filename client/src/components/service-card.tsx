import { cn } from "@/lib/utils";
import { LucideIcon, ExternalLink } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  isExternal?: boolean;
  onClick?: () => void;
}

export default function ServiceCard({ title, description, icon: Icon, color, isExternal, onClick }: ServiceCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group relative w-full overflow-hidden bg-card rounded-xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-98 min-w-0"
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-lg shrink-0 transition-transform group-hover:scale-110 duration-500", color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif font-bold text-base text-foreground leading-tight">{title}</h3>
            {isExternal && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50 shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-normal break-words">
            {description}
          </p>
        </div>
      </div>
      
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-xl group-hover:from-primary/10 transition-colors" />
    </div>
  );
}
