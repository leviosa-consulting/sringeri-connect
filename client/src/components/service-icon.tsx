import { cn } from "@/lib/utils";
import { LucideIcon, ExternalLink } from "lucide-react";
import { useInAppBrowser } from "@/contexts/in-app-browser-context";

interface ServiceIconProps {
  title: string;
  icon: LucideIcon;
  color: string;
  isExternal?: boolean;
  url?: string;
  onClick?: () => void;
}

export default function ServiceIcon({ title, icon: Icon, color, isExternal, url, onClick }: ServiceIconProps) {
  const { openUrl } = useInAppBrowser();
  const handleClick = () => {
    if (url) {
      openUrl(url);
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
        style={{ backgroundColor: '#fcfbf7' }}
      >
        <Icon className="h-6 w-6" color="#ff6600" />
        {isExternal && (
          <ExternalLink className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full p-0.5" color="#ff6600" />
        )}
      </div>
      <span className="text-xs font-medium text-center text-foreground leading-tight max-w-[80px]">
        {title}
      </span>
    </div>
  );
}
