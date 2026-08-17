import { useEffect, useState, useRef } from "react";
import { CalendarDays } from "lucide-react";

export interface SringeriEvent {
  id: string;
  title: string;
  description: string;
  date: string | null;
  dateTimestamp: number;
  featuredImage: string | null;
  location: string;
  status: string;
  url: string | null;
  slug: string;
  isOnline: boolean;
  showLiveStream: boolean;
}

export default function RecentEvents() {
  const [events, setEvents] = useState<SringeriEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchEvents = async () => {
      try {
        const [eventsRes, vyRes] = await Promise.all([
          fetch("/api/sringeri-events?limit=10"),
          fetch("/api/vijayayatra?limit=10"),
        ]);
        const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
        const vyData = vyRes.ok ? await vyRes.json() : { items: [] };

        const vyAsEvents = (vyData.items || []).map((e: any) => ({
          ...e,
          id: `vy-${e.id}`,
        }));

        const merged = [...(eventsData.events || []), ...vyAsEvents]
          .sort((a, b) => b.dateTimestamp - a.dateTimestamp)
          .slice(0, 10);

        if (!cancelled) setEvents(merged);
      } catch (error) {
        console.error("Error fetching sringeri events:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchEvents();
    return () => { cancelled = true; };
  }, []);

  if (loading || events.length === 0) return null;

  return (
    <div data-testid="section-featured-events">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif font-bold text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#ff6600]" />
          Recent Events
        </h2>
      </div>

      {/* Mobile: full-width swipeable cards */}
      <div className="lg:hidden">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onScroll={() => {
            const el = scrollRef.current;
            if (el && el.children.length > 0) {
              const children = Array.from(el.children) as HTMLElement[];
              let closestIdx = 0;
              let minDist = Infinity;
              children.forEach((child, i) => {
                const dist = Math.abs(child.offsetLeft - el.scrollLeft);
                if (dist < minDist) { minDist = dist; closestIdx = i; }
              });
              setActiveIndex(closestIdx);
            }
          }}
        >
          {events.map((event) => (
            <div
              key={event.id}
              className={`w-full shrink-0 snap-center ${event.url ? "cursor-pointer" : ""}`}
              onClick={() => event.url && window.open(event.url, "_blank")}
              data-testid={`card-featured-event-${event.id}`}
            >
              <div className="relative h-[220px] sm:h-[300px] overflow-hidden rounded-lg">
                {event.featuredImage ? (
                  <img
                    src={event.featuredImage}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#ff6600]/20 to-[#e8a735]/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1.5">
                  {event.date && (
                    <span className="inline-block bg-[#e8a735] text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm">
                      {event.date}
                    </span>
                  )}
                  <h3 className="font-serif font-bold text-base text-white leading-tight line-clamp-2">
                    {event.title}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
        {events.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {events.map((_, idx) => (
              <button
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === activeIndex ? "w-6 bg-[#ff6600]" : "w-1.5 bg-gray-300"}`}
                onClick={() => {
                  const el = scrollRef.current;
                  if (el && el.children[idx]) {
                    (el.children[idx] as HTMLElement).scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
                  }
                  setActiveIndex(idx);
                }}
                data-testid={`button-event-dot-${idx}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: large primary card + side cards */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        {events.slice(0, 3).map((event, idx) => (
          <div
            key={event.id}
            className={`relative overflow-hidden rounded-lg group ${idx === 0 ? "lg:col-span-2 lg:row-span-2" : ""} ${event.url ? "cursor-pointer" : ""}`}
            onClick={() => event.url && window.open(event.url, "_blank")}
            data-testid={`card-featured-event-desktop-${event.id}`}
          >
            <div className={`relative overflow-hidden ${idx === 0 ? "h-[360px]" : "h-[170px]"}`}>
              {event.featuredImage ? (
                <img
                  src={event.featuredImage}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#ff6600]/20 to-[#e8a735]/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1.5">
                {event.date && (
                  <span className="inline-block bg-[#e8a735] text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-sm">
                    {event.date}
                  </span>
                )}
                <h3 className={`font-serif font-bold text-white leading-tight line-clamp-2 ${idx === 0 ? "text-xl" : "text-sm"}`}>
                  {event.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
