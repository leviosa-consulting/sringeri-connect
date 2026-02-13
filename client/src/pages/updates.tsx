import { useEffect, useState, useMemo } from "react";
import { Loader2, Calendar, Megaphone, Play, Filter } from "lucide-react";
import { useInAppBrowser } from "@/contexts/in-app-browser-context";

interface UpdateItem {
  id: string;
  type: "event" | "announcement" | "video";
  title: string;
  timestamp: number;
  url: string | null;
}

interface DateGroup {
  label: string;
  items: UpdateItem[];
}

const TAG: Record<string, { label: string; icon: typeof Calendar; bg: string }> = {
  event: { label: "Event", icon: Calendar, bg: "bg-[#e8a735]/15 text-[#b8860b]" },
  announcement: { label: "Announcement", icon: Megaphone, bg: "bg-[#b85c2f]/15 text-[#b85c2f]" },
  video: { label: "Video", icon: Play, bg: "bg-[#c0392b]/15 text-[#c0392b]" },
};

function toDateLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function toDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeEvents(events: any[]): UpdateItem[] {
  return events.map((e) => ({
    id: `event-${e.id}`,
    type: "event" as const,
    title: e.title,
    timestamp: (e.dateTimestamp || 0) * (e.dateTimestamp < 1e12 ? 1000 : 1),
    url: e.url || null,
  }));
}

function normalizeAnnouncements(announcements: any[]): UpdateItem[] {
  return announcements.map((a) => ({
    id: `ann-${a.id}`,
    type: "announcement" as const,
    title: a.title,
    timestamp: (a.dateTimestamp || 0) * ((a.dateTimestamp || 0) < 1e12 ? 1000 : 1),
    url: a.url || null,
  }));
}

function normalizeVideos(videos: any[]): UpdateItem[] {
  return videos.map((v) => ({
    id: `vid-${v.videoId}`,
    type: "video" as const,
    title: v.title?.replace(/&amp;/g, "&") || "",
    timestamp: v.published ? new Date(v.published).getTime() : 0,
    url: v.url || null,
  }));
}

export default function Updates() {
  const { openUrl } = useInAppBrowser();
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [eventsRes, annRes, videosRes] = await Promise.all([
          fetch("/api/sringeri-events?limit=30&offset=0"),
          fetch("/api/announcements?limit=30"),
          fetch("/api/youtube-videos"),
        ]);

        const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
        const annData = annRes.ok ? await annRes.json() : { announcements: [] };
        const videosData = videosRes.ok ? await videosRes.json() : { videos: [] };

        const all = [
          ...normalizeEvents(eventsData.events || []),
          ...normalizeAnnouncements(annData.announcements || []),
          ...normalizeVideos(videosData.videos || []),
        ];

        all.sort((a, b) => b.timestamp - a.timestamp);
        setItems(all);
      } catch (error) {
        console.error("Error fetching updates:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["event", "announcement", "video"]));

  const allSelected = activeFilters.size === 3;

  const toggleFilter = (key: string) => {
    if (key === "all") {
      setActiveFilters(new Set(["event", "announcement", "video"]));
      return;
    }
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (allSelected) return items;
    return items.filter((i) => activeFilters.has(i.type));
  }, [items, activeFilters, allSelected]);

  const groups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, { label: string; items: UpdateItem[] }>();
    for (const item of filtered) {
      const key = toDateKey(item.timestamp);
      if (!map.has(key)) {
        map.set(key, { label: toDateLabel(item.timestamp), items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 pb-24">
      <h1 className="text-2xl font-serif font-bold mb-4 px-1" data-testid="text-updates-title">Updates</h1>

      <div className="flex items-center gap-2 mb-5 px-1 overflow-x-auto" data-testid="filter-bar">
        {([
          { key: "all", label: "All", icon: Filter },
          { key: "event", label: "Events", icon: Calendar },
          { key: "announcement", label: "Announcements", icon: Megaphone },
          { key: "video", label: "Videos", icon: Play },
        ] as const).map(({ key, label, icon: Icon }) => {
          const isActive = key === "all" ? allSelected : activeFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                isActive
                  ? "bg-[#e8a735] text-white border-[#e8a735]"
                  : "bg-white text-foreground/70 border-border hover:border-foreground/30"
              }`}
              data-testid={`filter-${key}`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12" data-testid="text-no-updates">No updates available</p>
      )}

      <div className="relative pl-6">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        {groups.map((group, gi) => (
          <div key={gi} className="mb-6 last:mb-0">
            <div className="relative flex items-center mb-3">
              <div className="absolute -left-6 w-[19px] h-[19px] rounded-full bg-[#e8a735] border-2 border-white shadow-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-sm font-semibold text-foreground/80 tracking-wide">{group.label}</span>
            </div>

            <div className="space-y-2 ml-1">
              {group.items.map((item) => {
                const tag = TAG[item.type];
                const Icon = tag.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => item.url && openUrl(item.url)}
                    className="flex items-start gap-2.5 group py-1.5 cursor-pointer"
                    data-testid={`link-update-${item.id}`}
                  >
                    <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${tag.bg}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {tag.label}
                    </span>
                    <span className="text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
