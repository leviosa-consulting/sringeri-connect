import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface Announcement {
  id: string;
  title: string;
  description: string;
  slug: string;
  url: string | null;
  date: string | null;
  dateTimestamp: number;
}

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch("/api/announcements?limit=10");
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };
    fetchAnnouncements();
    return () => { cancelled = true; };
  }, []);

  if (announcements.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#ff6600]" />
          <h2 className="text-lg font-bold font-serif" data-testid="text-announcements-heading">Announcements</h2>
        </div>
      </div>

      <div className="lg:hidden">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="w-[280px] shrink-0 border border-border/50 bg-card flex flex-col justify-between hover:shadow-md transition-shadow"
                data-testid={`card-announcement-${item.id}`}
              >
                <div className="p-4 flex-1">
                  {item.date && (
                    <p className="text-xs font-semibold text-[#ff6600] mb-2 whitespace-normal">{item.date}</p>
                  )}
                  <h3 className="font-serif font-bold text-sm line-clamp-3 whitespace-normal leading-snug">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-2 whitespace-normal leading-relaxed">{item.description}</p>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <button
                    className="text-xs font-bold text-white bg-[#B4A597] hover:bg-[#a39487] px-4 py-1.5 rounded-[3px] transition-colors"
                    onClick={() => item.url && window.open(item.url, "_blank")}
                    data-testid={`button-learn-more-${item.id}`}
                  >LEARN MORE</button>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="hidden lg:block">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-2">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="w-[300px] shrink-0 border border-border/50 bg-card flex flex-col justify-between hover:shadow-md transition-shadow"
                data-testid={`card-announcement-desktop-${item.id}`}
              >
                <div className="p-5 flex-1">
                  {item.date && (
                    <p className="text-xs font-semibold text-[#ff6600] mb-2 whitespace-normal">{item.date}</p>
                  )}
                  <h3 className="font-serif font-bold text-sm line-clamp-3 whitespace-normal leading-snug">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-4 mt-2 whitespace-normal leading-relaxed">{item.description}</p>
                  )}
                </div>
                <div className="px-5 pb-4">
                  <button
                    className="text-xs font-bold text-white bg-[#B4A597] hover:bg-[#a39487] px-4 py-1.5 rounded-[3px] transition-colors"
                    onClick={() => item.url && window.open(item.url, "_blank")}
                    data-testid={`button-learn-more-desktop-${item.id}`}
                  >LEARN MORE</button>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>
    </section>
  );
}
