import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import RecentEvents from "@/components/updates/recent-events";
import AnnouncementsSection from "@/components/updates/announcements-section";
import LatestVideos from "@/components/updates/latest-videos";
import TimelineView from "@/components/updates/timeline-view";

type UpdatesView = "detail" | "timeline";

const VIEW_STORAGE_KEY = "updates:view";

function readStoredView(): UpdatesView {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "timeline" || stored === "detail") return stored;
  } catch {}
  return "detail";
}

export default function Updates() {
  const [view, setView] = useState<UpdatesView>(readStoredView);

  const changeView = (next: UpdatesView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {}
  };

  const tabs: { key: UpdatesView; label: string; icon: typeof LayoutGrid }[] = [
    { key: "detail", label: "Detail", icon: LayoutGrid },
    { key: "timeline", label: "Timeline", icon: List },
  ];

  return (
    <div className="px-4 py-8 pb-24">
      <div className="flex items-center justify-between gap-3 mb-5 px-1">
        <h1 className="text-2xl font-serif font-bold" data-testid="text-updates-title">Updates</h1>

        <div className="inline-flex items-center rounded-full bg-muted p-0.5" data-testid="updates-view-switcher">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = view === key;
            return (
              <button
                key={key}
                onClick={() => changeView(key)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-updates-view-${key}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "detail" ? (
        <div className="space-y-8" data-testid="view-updates-detail">
          <RecentEvents />
          <AnnouncementsSection />
          <LatestVideos />
        </div>
      ) : (
        <div data-testid="view-updates-timeline">
          <TimelineView />
        </div>
      )}
    </div>
  );
}
