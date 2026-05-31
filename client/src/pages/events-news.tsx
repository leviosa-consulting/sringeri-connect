import { useEffect, useState } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SringeriEvent {
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

const PAGE_SIZE = 20;

export default function EventsNews() {
  const [events, setEvents] = useState<SringeriEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchEvents = async (currentOffset: number, append = false) => {
    try {
      if (append) setLoadingMore(true);
      const response = await fetch(`/api/sringeri-events?limit=${PAGE_SIZE}&offset=${currentOffset}`);
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setEvents(prev => [...prev, ...(data.events || [])]);
        } else {
          setEvents(data.events || []);
        }
        setHasMore(data.hasMore || false);
        setOffset(currentOffset + PAGE_SIZE);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEvents(0);
  }, []);

  const loadMore = () => {
    fetchEvents(offset, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RangoliLoader size={40} />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 pb-24 space-y-6">
      <h1 className="text-2xl font-serif font-bold px-2" data-testid="text-events-title">Events & Happenings</h1>
      
      <div className="space-y-4">
        {events.map((item) => (
          <Card 
            key={item.id} 
            className="rounded-none overflow-hidden border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => item.url && window.open(item.url, "_blank")}
            data-testid={`card-event-${item.id}`}
          >
            {item.featuredImage && (
              <div className="h-48 overflow-hidden relative">
                <img src={item.featuredImage} alt={item.title} className="w-full h-full object-cover" />
                {item.date && (
                  <div className="absolute bottom-0 left-0">
                    <span className="inline-block bg-[#e8a735] text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5">
                      {item.date}
                    </span>
                  </div>
                )}
              </div>
            )}
            {!item.featuredImage && item.date && (
              <div className="px-4 pt-4">
                <span className="inline-block bg-[#e8a735] text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5">
                  {item.date}
                </span>
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg leading-tight">{item.title}</CardTitle>
            </CardHeader>
            {item.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={loadMore} 
            disabled={loadingMore}
            className="w-full max-w-xs"
            data-testid="button-load-more-events"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Events"
            )}
          </Button>
        </div>
      )}

      {!hasMore && events.length > 0 && (
        <p className="text-center text-sm text-muted-foreground pt-4" data-testid="text-all-events-loaded">
          All events loaded
        </p>
      )}
    </div>
  );
}
