import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, Megaphone, Play } from "lucide-react";

interface UpdateItem {
  id: string;
  type: "event" | "announcement" | "video";
  title: string;
  description: string;
  date: string | null;
  timestamp: number;
  image: string | null;
  url: string | null;
}

const TYPE_CONFIG = {
  event: { label: "Event", icon: Calendar, color: "bg-[#e8a735] text-white" },
  announcement: { label: "Announcement", icon: Megaphone, color: "bg-[#b85c2f] text-white" },
  video: { label: "Video", icon: Play, color: "bg-[#c0392b] text-white" },
};

function normalizeEvents(events: any[]): UpdateItem[] {
  return events.map((e) => ({
    id: `event-${e.id}`,
    type: "event" as const,
    title: e.title,
    description: e.description || "",
    date: e.date || null,
    timestamp: (e.dateTimestamp || 0) * (e.dateTimestamp < 1e12 ? 1000 : 1),
    image: e.featuredImage || null,
    url: e.url || null,
  }));
}

function normalizeAnnouncements(announcements: any[]): UpdateItem[] {
  return announcements.map((a) => ({
    id: `ann-${a.id}`,
    type: "announcement" as const,
    title: a.title,
    description: a.description || "",
    date: a.date || null,
    timestamp: (a.dateTimestamp || 0) * ((a.dateTimestamp || 0) < 1e12 ? 1000 : 1),
    image: null,
    url: a.url || null,
  }));
}

function normalizeVideos(videos: any[]): UpdateItem[] {
  return videos.map((v) => ({
    id: `vid-${v.videoId}`,
    type: "video" as const,
    title: v.title?.replace(/&amp;/g, "&") || "",
    description: "",
    date: v.date || null,
    timestamp: v.published ? new Date(v.published).getTime() : 0,
    image: v.thumbnail || null,
    url: v.url || null,
  }));
}

export default function Updates() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 pb-24 space-y-4">
      <h1 className="text-2xl font-serif font-bold px-2" data-testid="text-updates-title">Updates</h1>

      {items.length === 0 && (
        <p className="text-center text-muted-foreground py-12" data-testid="text-no-updates">No updates available</p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const cfg = TYPE_CONFIG[item.type];
          const Icon = cfg.icon;
          return (
            <Card
              key={item.id}
              className="rounded-none overflow-hidden border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => item.url && window.open(item.url, "_blank")}
              data-testid={`card-update-${item.id}`}
            >
              {item.image && (
                <div className="h-44 overflow-hidden relative">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute top-0 left-0 flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-1 ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                  {item.date && (
                    <div className="absolute bottom-0 left-0">
                      <span className="inline-block bg-black/60 text-white text-xs px-2.5 py-1">
                        {item.date}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!item.image && (
                <div className="px-4 pt-3 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-1 ${cfg.color}`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                  {item.date && (
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  )}
                </div>
              )}

              <CardHeader className="pb-1 pt-2">
                <CardTitle className="font-serif text-base leading-tight">{item.title}</CardTitle>
              </CardHeader>
              {item.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
