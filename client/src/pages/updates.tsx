import { useEffect, useState, useMemo } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { Calendar, Megaphone, Play, MapPin } from "lucide-react";

interface UpdateItem {
  id: string;
  type: "event" | "announcement" | "video" | "vijayayatra";
  title: string;
  timestamp: number;
  url: string | null;
}

interface DateGroup {
  label: string;
  items: UpdateItem[];
}

const ALL_TYPES = ["event", "vijayayatra", "announcement", "video"] as const;
type UpdateType = typeof ALL_TYPES[number];

const TAG: Record<UpdateType, { label: string; icon: typeof Calendar; bg: string; color: string; activeBg: string }> = {
  event: { label: "Event", icon: Calendar, bg: "bg-[#e8a735]/15 text-[#e8a735]", color: "#e8a735", activeBg: "bg-[#e8a735] text-white border-[#e8a735]" },
  vijayayatra: { label: "Vijaya Yatra", icon: MapPin, bg: "bg-[#0891b2]/15 text-[#0891b2]", color: "#0891b2", activeBg: "bg-[#0891b2] text-white border-[#0891b2]" },
  announcement: { label: "Announcement", icon: Megaphone, bg: "bg-[#ff6600]/15 text-[#ff6600]", color: "#ff6600", activeBg: "bg-[#ff6600] text-white border-[#ff6600]" },
  video: { label: "Video", icon: Play, bg: "bg-[#c0392b]/15 text-[#c0392b]", color: "#c0392b", activeBg: "bg-[#c0392b] text-white border-[#c0392b]" },
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

function normalizeVijayaYatra(items: any[]): UpdateItem[] {
  return items.map((e) => ({
    id: `vy-${e.id}`,
    type: "vijayayatra" as const,
    title: e.title,
    timestamp: (e.dateTimestamp || 0) * ((e.dateTimestamp || 0) < 1e12 ? 1000 : 1),
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

function parseRelativeTime(str: string): number {
  if (!str) return Date.now();
  const isoDate = new Date(str).getTime();
  if (!isNaN(isoDate) && isoDate > 0) return isoDate;
  const m = str.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const ms: Record<string, number> = { second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000, year: 31536000000 };
    return Date.now() - n * (ms[unit] || 86400000);
  }
  return Date.now();
}

function normalizeVideos(videos: any[]): UpdateItem[] {
  return videos.map((v) => ({
    id: `vid-${v.videoId}`,
    type: "video" as const,
    title: v.title?.replace(/&amp;/g, "&") || "Sringeri Video",
    timestamp: parseRelativeTime(v.published),
    url: v.url || null,
  }));
}

export default function Updates() {
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [eventsRes, vyRes, annRes, videosRes] = await Promise.all([
          fetch("/api/sringeri-events?limit=30&offset=0"),
          fetch("/api/vijayayatra?limit=30&offset=0"),
          fetch("/api/announcements?limit=30"),
          fetch("/api/youtube-videos"),
        ]);

        const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
        const vyData = vyRes.ok ? await vyRes.json() : { items: [] };
        const annData = annRes.ok ? await annRes.json() : { announcements: [] };
        const videosData = videosRes.ok ? await videosRes.json() : { videos: [] };

        const all = [
          ...normalizeEvents(eventsData.events || []),
          ...normalizeVijayaYatra(vyData.items || []),
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

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(ALL_TYPES));

  const allSelected = activeFilters.size === ALL_TYPES.length;

  const toggleFilter = (key: string) => {
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
        <RangoliLoader size={40} />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 pb-24">
      <h1 className="text-2xl font-serif font-bold mb-4 px-1" data-testid="text-updates-title">Updates</h1>

      <div className="flex items-center gap-2 mb-5 px-1 overflow-x-auto" data-testid="filter-bar">
        {(ALL_TYPES.map((key) => ({ key, label: TAG[key].label, icon: TAG[key].icon }))).map(({ key, label, icon: Icon }) => {
          const isActive = activeFilters.has(key);
          const activeCls = TAG[key].activeBg;
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                isActive
                  ? activeCls
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
              <div className="absolute -left-6 w-[19px] h-[19px] rounded-full bg-[#8B7D6B] border-2 border-white shadow-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-sm font-semibold text-foreground/80 tracking-wide">{group.label}</span>
            </div>

            <div className="space-y-2 ml-1">
              {group.items.map((item) => {
                const tag = TAG[item.type as UpdateType];
                const Icon = tag.icon;
                return (
                  <a
                    key={item.id}
                    href={item.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 group py-1.5 cursor-pointer"
                    data-testid={`link-update-${item.id}`}
                  >
                    <span className={`shrink-0 inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider rounded ${tag.activeBg} w-6 h-6 lg:w-[100px] lg:h-auto lg:px-1.5 lg:py-0.5`}>
                      <Icon className="h-3 w-3 lg:h-2.5 lg:w-2.5" />
                      <span className="hidden lg:inline">{tag.label}</span>
                    </span>
                    <span className="text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
