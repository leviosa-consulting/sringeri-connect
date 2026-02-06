import { useEffect, useState } from "react";
import ServiceIcon from "@/components/service-icon";
import { ONLINE_SERVICES, RESOURCES } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMedia } from "react-use";
import { useAuth } from "@/contexts/auth-context";
import guruBanner from "@/assets/guru-banner.png";

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

interface TodayDetails {
  todayWebsiteKannada?: string;
  todayWebsiteEnglish?: string;
  occasion?: string;
  occasionK?: string;
  samvatsara?: string;
  samvatsaraK?: string;
  chandraMasa?: string;
  chandraMasaK?: string;
  tithi?: string;
  tithiK?: string;
  nakshatra?: string;
  nakshatraK?: string;
}

export default function Home() {
  const isDesktop = useMedia('(min-width: 768px)', false);
  const { profile, user } = useAuth();
  const [todayDetails, setTodayDetails] = useState<TodayDetails | null>(null);
  const [panchangaLang, setPanchangaLang] = useState<'en' | 'kn'>('en');
  const [sringeriEvents, setSringeriEvents] = useState<SringeriEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const displayName = profile?.name || user?.displayName || "Devotee";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const fetchTodayDetails = async () => {
      try {
        // Get today's date in IST (yyyy-mm-dd format)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const dateStr = istDate.toISOString().split('T')[0];
        
        const response = await fetch(`/api/todayDetails/${dateStr}`);
        if (response.ok) {
          const data = await response.json();
          setTodayDetails(data);
        }
      } catch (error) {
        console.error("Error fetching today details:", error);
      }
    };
    
    fetchTodayDetails();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/sringeri-events?limit=10');
        if (response.ok) {
          const data = await response.json();
          setSringeriEvents(data.events || []);
        }
      } catch (error) {
        console.error("Error fetching sringeri events:", error);
      } finally {
        setEventsLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const formatTodayDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-8 pb-24 md:pb-8 w-full overflow-hidden">
      {/* Guru Banner - Mobile */}
      <div className="md:hidden px-4 pt-4">
        <img 
          src={guruBanner} 
          alt="Sri Sharada Devi and Jagadgurus" 
          className="w-full h-auto"
          data-testid="img-guru-banner"
        />
      </div>

      {/* Header Section */}
      <div className="md:hidden px-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-muted-foreground">Namaste,</h2>
              <h1 className="text-2xl font-serif font-bold text-foreground">{displayName}</h1>
            </div>
            <div className="flex gap-3">
              <button className="p-2 rounded-full bg-white/80 border border-primary/10 shadow-sm hover:bg-white transition-colors">
                <Bell className="h-5 w-5 text-primary" />
              </button>
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search for sevas, books, etc..." 
              className="pl-9 bg-white/80 border-primary/10 shadow-sm focus:bg-white transition-all rounded-xl" 
            />
          </div>
      </div>

      {/* Desktop Welcome Banner */}
      <div className="hidden md:flex relative h-[300px] w-full rounded-2xl overflow-hidden bg-primary/5 border border-primary/10 items-center px-12 justify-between">
         <div className="space-y-4 z-10 max-w-lg">
           <h1 className="text-5xl font-serif font-bold text-primary">Sri Sringeri Sharada Peetham</h1>
           <p className="text-xl text-muted-foreground">Official Digital Services Portal for Devotees</p>
           <div className="relative max-w-md mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search services..." 
              className="pl-9 bg-white shadow-sm border-primary/20 h-12 text-base" 
            />
          </div>
         </div>
         <div className="absolute right-0 top-0 h-full w-2/3 bg-[url('/assets/temple-hero.jpg')] bg-cover bg-center mask-linear-fade opacity-80" style={{maskImage: 'linear-gradient(to right, transparent, black)'}} />
      </div>

      {/* Hindu Calendar Strip */}
      {todayDetails && (
        <div className="mx-4 md:mx-0 py-4 px-6 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-primary/10 rounded-xl text-center space-y-2" data-testid="card-today-calendar">
          {/* Occasion if any */}
          {(todayDetails.occasionK || todayDetails.occasion) && (
            <div className="pb-2 border-b border-primary/10">
              {todayDetails.occasionK && (
                <div className="text-sm font-medium text-primary" data-testid="text-occasion-kannada">{todayDetails.occasionK}</div>
              )}
              {todayDetails.occasion && (
                <div className="text-xs text-muted-foreground" data-testid="text-occasion-english">{todayDetails.occasion}</div>
              )}
            </div>
          )}
          
          {/* Combined Panchanga Text with Info Icon */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1">
              {todayDetails.todayWebsiteKannada && (
                <div className="text-base font-serif text-foreground" data-testid="text-calendar-kannada">{todayDetails.todayWebsiteKannada}</div>
              )}
              {todayDetails.todayWebsiteEnglish && (
                <div className="text-sm text-muted-foreground" data-testid="text-calendar-english">{todayDetails.todayWebsiteEnglish}</div>
              )}
            </div>
            
            {/* Info Icon with Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 rounded-full hover:bg-primary/10 transition-colors" data-testid="button-panchanga-info">
                  <Info className="h-4 w-4 text-primary" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-sm text-primary">
                      {panchangaLang === 'en' ? 'Panchanga Details' : 'ಪಂಚಾಂಗ ವಿವರಗಳು'}
                    </h4>
                    <div className="flex gap-1 text-xs">
                      <button 
                        onClick={() => setPanchangaLang('en')}
                        className={`px-2 py-0.5 rounded ${panchangaLang === 'en' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                        data-testid="button-lang-en"
                      >
                        EN
                      </button>
                      <button 
                        onClick={() => setPanchangaLang('kn')}
                        className={`px-2 py-0.5 rounded ${panchangaLang === 'kn' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                        data-testid="button-lang-kn"
                      >
                        ಕನ್ನಡ
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{panchangaLang === 'en' ? 'Samvatsara:' : 'ಸಂವತ್ಸರ:'}</span>
                      <span className="font-medium text-right">{panchangaLang === 'en' ? todayDetails.samvatsara : todayDetails.samvatsaraK}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{panchangaLang === 'en' ? 'Chandra Masa:' : 'ಚಂದ್ರ ಮಾಸ:'}</span>
                      <span className="font-medium text-right">{panchangaLang === 'en' ? todayDetails.chandraMasa : todayDetails.chandraMasaK}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{panchangaLang === 'en' ? 'Tithi:' : 'ತಿಥಿ:'}</span>
                      <span className="font-medium text-right">{panchangaLang === 'en' ? todayDetails.tithi : todayDetails.tithiK}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{panchangaLang === 'en' ? 'Nakshatra:' : 'ನಕ್ಷತ್ರ:'}</span>
                      <span className="font-medium text-right">{panchangaLang === 'en' ? todayDetails.nakshatra : todayDetails.nakshatraK}</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Date and Link */}
          <div className="pt-2 border-t border-primary/10 flex items-center justify-between">
            <div className="text-xs font-semibold text-primary" data-testid="text-today-date">{formatTodayDate()}</div>
            <a 
              href="https://sandhyakala.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-medium"
              data-testid="link-detailed-panchanga"
            >
              Sandhya Kala Details →
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col md:grid md:grid-cols-12 gap-8 px-4 md:px-0">
        
        {/* Main Content Column */}
        <div className="md:col-span-8 space-y-8">
          
          {/* Online Services */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full block"></span>
                Online Services
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-1 bg-card rounded-xl border border-border/50 py-2">
              {ONLINE_SERVICES.map((service) => (
                <ServiceIcon 
                  key={service.id}
                  {...service}
                  onClick={() => console.log(`Clicked ${service.id}`)}
                />
              ))}
            </div>
          </section>

          {/* Resources Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg flex items-center gap-2">
                <span className="w-1 h-5 bg-secondary rounded-full block"></span>
                Resources
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-1 bg-card rounded-xl border border-border/50 py-2">
              {RESOURCES.map((resource) => (
                <ServiceIcon 
                  key={resource.id}
                  {...resource}
                />
              ))}
            </div>
          </section>

        </div>

        {/* Sidebar / Secondary Content */}
        <div className="md:col-span-4 space-y-8">
           
           {/* Happenings / Events */}
           <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl">Happenings</h2>
              <a 
                href="/events"
                className="text-sm text-primary hover:underline cursor-pointer"
                data-testid="link-view-all-events"
              >
                View All
              </a>
            </div>
            
            {eventsLoading ? (
              <div className="text-sm text-muted-foreground text-center py-6">Loading events...</div>
            ) : sringeriEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">No upcoming events</div>
            ) : (
              <>
                {/* Mobile Horizontal Scroll */}
                <div className="md:hidden">
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex w-max space-x-4 pb-4">
                      {sringeriEvents.map((item) => (
                        <div 
                          key={item.id} 
                          className="w-[280px] shrink-0 rounded-xl overflow-hidden border border-border/50 shadow-sm group cursor-pointer"
                          onClick={() => item.url && window.open(item.url, "_blank")}
                          data-testid={`card-event-${item.id}`}
                        >
                          {item.featuredImage && (
                            <div className="h-32 overflow-hidden relative">
                              <img 
                                src={item.featuredImage} 
                                alt={item.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                              />
                              {item.location && (
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-medium uppercase tracking-wider">
                                  {item.location}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="p-4 bg-card space-y-2">
                            {item.date && (
                              <div className="text-xs text-primary font-medium">{item.date}</div>
                            )}
                            <h3 className="font-serif font-bold text-base truncate pr-2">{item.title}</h3>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-normal leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                  </ScrollArea>
                </div>

                {/* Desktop Vertical List */}
                <div className="hidden md:flex flex-col gap-4">
                  {sringeriEvents.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex gap-4 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow group cursor-pointer"
                      onClick={() => item.url && window.open(item.url, "_blank")}
                      data-testid={`card-event-desktop-${item.id}`}
                    >
                      {item.featuredImage && (
                        <div className="h-20 w-20 rounded-lg overflow-hidden shrink-0">
                          <img src={item.featuredImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          {item.location && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded">{item.location}</span>
                          )}
                          {item.date && (
                            <span className="text-xs text-muted-foreground">{item.date}</span>
                          )}
                        </div>
                        <h3 className="font-serif font-bold text-sm mt-1 line-clamp-2">{item.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </section>
        </div>

      </div>
    </div>
  );
}
