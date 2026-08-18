import { useState } from "react";
import { Flower2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import DailyPracticeCalendar from "@/components/daily-practice-calendar";

export default function DharmaHistory() {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);

  if (!user) return null;

  return (
    <div className="space-y-4" data-testid="section-dharma-history">
      <div className="flex items-center gap-2">
        <Flower2 className="w-4 h-4 text-[#ff6600]" />
        <h3 className="font-serif font-bold text-base">Daily Practice</h3>
        <span className="ml-auto text-sm font-semibold text-foreground/70" data-testid="text-dharma-history-total">
          {total} points
        </span>
      </div>

      <DailyPracticeCalendar
        emptyStateText="You have not taken part in the daily practice yet. Open Today on the home page to begin."
        onTotalsChange={(t) => setTotal(t.total)}
      />
    </div>
  );
}
