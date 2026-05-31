import { RangoliLoader } from "@/components/rangoli-loader";
import { cn } from "@/lib/utils"

function Spinner({ className }: { className?: string }) {
  return <RangoliLoader size={20} className={cn("inline-block", className)} />;
}

export { Spinner }
