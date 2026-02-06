import { cn } from "@/lib/utils";
import { LucideIcon, ExternalLink } from "lucide-react";

interface ServiceIconProps {
  title: string;
  icon: LucideIcon;
  color: string;
  isExternal?: boolean;
  url?: string;
  onClick?: () => void;
}

export default function ServiceIcon({ title, icon: Icon, color, isExternal, url, onClick }: ServiceIconProps) {
  const handleClick = () => {
    if (url) {
      window.open(url, "_blank");
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex flex-col items-center gap-2 p-3 cursor-pointer group"
      data-testid={`service-icon-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="relative p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 group-active:scale-95 shadow-sm"
        style={{ backgroundColor: '#ebe3d6' }}
      >
        <Icon className="h-6 w-6" style={{ color: '#c4722a' }} />
        {isExternal && (
          <ExternalLink className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full p-0.5" style={{ color: '#c4722a' }} />
        )}
      </div>
      <span className="text-xs font-medium text-center text-foreground leading-tight max-w-[80px]">
        {title}
      </span>
    </div>
  );
}
