import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import ServiceIcon from "@/components/service-icon";
import { ONLINE_SERVICES, RESOURCES } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Info, Megaphone, Play, Globe, BookOpen, CalendarDays, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";
import { getIdToken } from "@/lib/firebase";
import FontSizeToggle from "@/components/font-size-toggle";
import TodayCarousel from "@/components/today-carousel";
import guruBanner from "@assets/footer-collage-web_(1)_1773382448292.webp";
import calendarBg from "@assets/background-writing-web_1770978468122.jpg";

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

interface Announcement {
  id: string;
  title: string;
  description: string;
  slug: string;
  url: string | null;
  date: string | null;
  dateTimestamp: number;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  published: string;
  date: string | null;
  thumbnail: string;
  url: string;
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
  const [_, setLocation] = useLocation();
  const { profile, user, avatarUrl } = useAuth();
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const [todayDetails, setTodayDetails] = useState<TodayDetails | null>(null);
  const [panchangaLang, setPanchangaLang] = useState<'en' | 'kn'>('en');
  const [sringeriEvents, setSringeriEvents] = useState<SringeriEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [todaySheetOpen, setTodaySheetOpen] = useState(false);
  const [todayQuiz, setTodayQuiz] = useState<{ id: number; title: string; subtitle?: string | null } | null>(null);
  const eventScrollRef = useRef<HTMLDivElement>(null);
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
    const fetchTodayQuiz = async () => {
      if (!user) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/quiz/today", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.id) {
            setTodayQuiz({ id: data.id, title: data.title, subtitle: data.subtitle });
          }
        }
      } catch {}
    };
    fetchTodayQuiz();
  }, [user]);

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

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements?limit=10');
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const fetchYoutubeVideos = async () => {
      try {
        const response = await fetch('/api/youtube-videos');
        if (response.ok) {
          const data = await response.json();
          setYoutubeVideos(data.videos || []);
        }
      } catch (error) {
        console.error("Error fetching YouTube videos:", error);
      }
    };
    fetchYoutubeVideos();
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
    <div className="flex flex-col gap-8 pb-24 lg:pb-8 w-full">
      {/* Guru Banner - Mobile */}
      <div className="lg:hidden w-screen relative left-1/2 -translate-x-1/2 h-[120px] sm:h-[180px] overflow-hidden">
        <img 
          src={guruBanner} 
          alt="Sri Sharada Devi and Jagadgurus" 
          className="w-full h-full object-cover object-center"
          data-testid="img-guru-banner"
        />
      </div>
      {/* Header + Panchanga gradient wrapper (mobile) */}
      <div className="lg:hidden -mt-8 w-screen relative left-1/2 -translate-x-1/2" style={{ background: 'linear-gradient(to bottom, #ffffff, #d9cfc3)' }}>
        {/* Header Section */}
        <div className="px-4 pt-5 pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Avatar removed for this version (camera permissions issue with app approval) */}
              <div className="space-y-0.5">
                <h2 className="text-xs font-medium text-muted-foreground">Namaste,</h2>
                <h1 className="text-xl font-serif font-bold text-foreground">{displayName}</h1>
              </div>
            </div>
            <FontSizeToggle />
          </div>
        </div>

        {/* Hindu Calendar Strip */}
        {todayDetails && (
          <div className="py-5 px-6 text-center space-y-3" data-testid="card-today-calendar">
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1">
              {todayDetails.todayWebsiteKannada && (
                <div className="text-lg font-serif text-foreground leading-relaxed" style={{ fontFamily: "'Noto Serif Kannada', 'Merriweather', serif" }} data-testid="text-calendar-kannada">{todayDetails.todayWebsiteKannada}</div>
              )}
              {todayDetails.todayWebsiteEnglish && (
                <div className="mt-1 text-[#443b31] font-semibold text-[16px]" data-testid="text-calendar-english">{todayDetails.todayWebsiteEnglish}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="font-semibold text-foreground" data-testid="text-today-date">{formatTodayDate()}</div>
            <a 
              href="https://sringeri-panchangam.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline text-[#443b31] font-bold"
              data-testid="link-detailed-panchanga"
            >See Complete Panchanga →</a>
          </div>

        </div>
      )}

        {/* Today Button — always visible */}
        <div className="py-3 flex justify-center">
          <button
            onClick={() => setTodaySheetOpen(true)}
            className="group relative mx-auto flex items-center gap-1.5 px-6 py-2 rounded-full bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all duration-200"
            data-testid="button-today-ritual"
          >
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
            <span className="relative">Today</span>
            <ChevronDown className="w-4 h-4 relative group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
      {/* Today Carousel Sheet */}
      <TodayCarousel
        open={todaySheetOpen}
        onClose={() => setTodaySheetOpen(false)}
        todayDetails={todayDetails}
        formattedDate={formatTodayDate()}
        todayQuiz={todayQuiz}
      />
      {/* Desktop Welcome Banner */}
      <div className="hidden lg:block w-screen relative left-1/2 -translate-x-1/2 h-[300px] overflow-hidden">
        <img 
          src={guruBanner} 
          alt="Sri Sharada Devi and Jagadgurus" 
          className="w-full h-full object-cover object-center"
          data-testid="img-guru-banner-desktop"
        />
      </div>
      {/* Desktop Hindu Calendar Strip */}
      {todayDetails && (
        <div className="hidden lg:block py-4 px-6 text-center space-y-2 bg-cover bg-center w-screen relative left-1/2 -translate-x-1/2" style={{ backgroundImage: `url(${calendarBg})` }} data-testid="card-today-calendar-desktop">
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1">
              {todayDetails.todayWebsiteKannada && (
                <div className="text-base font-serif text-foreground">{todayDetails.todayWebsiteKannada}</div>
              )}
              {todayDetails.todayWebsiteEnglish && (
                <div className="text-sm text-foreground/70">{todayDetails.todayWebsiteEnglish}</div>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 rounded-full hover:bg-primary/10 transition-colors">
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
                      >EN</button>
                      <button 
                        onClick={() => setPanchangaLang('kn')}
                        className={`px-2 py-0.5 rounded ${panchangaLang === 'kn' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                      >ಕನ್ನಡ</button>
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
          <div className="pt-2 border-t border-foreground/10 flex items-center justify-between">
            <div className="text-xs font-semibold text-foreground">{formatTodayDate()}</div>
            <a 
              href="https://sringeri-panchangam.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-foreground hover:underline font-medium"
            >
              See Complete Panchanga →
            </a>
          </div>
        </div>
      )}
      {/* Featured Events Hero */}
      {!eventsLoading && sringeriEvents.length > 0 && (
        <div className="px-4 lg:px-6" data-testid="section-featured-events">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif font-bold text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#ff6600]" />
              Recent Events
            </h2>
          </div>

          {/* Mobile: full-width swipeable cards */}
          <div className="lg:hidden">
            <div
              ref={eventScrollRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={() => {
                const el = eventScrollRef.current;
                if (el && el.children.length > 0) {
                  const children = Array.from(el.children) as HTMLElement[];
                  let closestIdx = 0;
                  let minDist = Infinity;
                  children.forEach((child, i) => {
                    const dist = Math.abs(child.offsetLeft - el.scrollLeft);
                    if (dist < minDist) { minDist = dist; closestIdx = i; }
                  });
                  setActiveEventIndex(closestIdx);
                }
              }}
            >
              {sringeriEvents.map((event) => (
                <div
                  key={event.id}
                  className={`w-full shrink-0 snap-center ${event.url ? 'cursor-pointer' : ''}`}
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
            {sringeriEvents.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {sringeriEvents.map((_, idx) => (
                  <button
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${idx === activeEventIndex ? 'w-6 bg-[#ff6600]' : 'w-1.5 bg-gray-300'}`}
                    onClick={() => {
                      const el = eventScrollRef.current;
                      if (el && el.children[idx]) {
                        (el.children[idx] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                      }
                      setActiveEventIndex(idx);
                    }}
                    data-testid={`button-event-dot-${idx}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop: large primary card + side cards */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4">
            {sringeriEvents.slice(0, 3).map((event, idx) => (
              <div
                key={event.id}
                className={`relative overflow-hidden rounded-lg group ${idx === 0 ? 'lg:col-span-2 lg:row-span-2' : ''} ${event.url ? 'cursor-pointer' : ''}`}
                onClick={() => event.url && window.open(event.url, "_blank")}
                data-testid={`card-featured-event-desktop-${event.id}`}
              >
                <div className={`relative overflow-hidden ${idx === 0 ? 'h-[360px]' : 'h-[170px]'}`}>
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
                    <h3 className={`font-serif font-bold text-white leading-tight line-clamp-2 ${idx === 0 ? 'text-xl' : 'text-sm'}`}>
                      {event.title}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 px-4 lg:px-6">
        
        {/* Main Content Column */}
        <div className="lg:col-span-12 space-y-8">
          
          {/* Online Services */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#ff6600]" />
                Online Services
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-1 bg-card rounded-xl border border-border/50 py-2">
              {ONLINE_SERVICES.map((service) => {
                const isDonateOnIOS = service.id === "donate" && isIOS;
                return (
                  <ServiceIcon 
                    key={service.id}
                    {...service}
                    isExternal={isDonateOnIOS || service.isExternal}
                    url={isDonateOnIOS ? undefined : service.url}
                    onClick={() => {
                      if (isDonateOnIOS) {
                        window.location.href = "https://donate.sringeri.net";
                        return;
                      }
                      if (service.id === "accommodation") setLocation("/accommodation");
                      if (service.id === "donate") setLocation("/donation");
                      if (service.id === "seva") setLocation("/seva");
                    }}
                  />
                );
              })}
            </div>
          </section>

          {/* Resources Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#ff6600]" />
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


        {announcements.length > 0 && (
          <div className="lg:col-span-12">
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
          </div>
        )}

        {youtubeVideos.length > 0 && (
          <div className="mt-3 pb-3 lg:col-span-12">
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-bold font-serif" data-testid="text-youtube-heading">Latest Videos</h2>
                </div>
                <a href="https://www.youtube.com/@SharadaPeetham" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium" data-testid="link-youtube-channel">View Channel</a>
              </div>

              <div className="lg:hidden">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-3 pb-2">
                    {youtubeVideos.map((video) => (
                      <div
                        key={video.videoId}
                        className="w-[280px] shrink-0 border border-border/50 bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                        data-testid={`card-video-${video.videoId}`}
                      >
                        <div className="relative cursor-pointer" onClick={() => window.open(video.url, "_blank")}>
                          <img src={video.thumbnail} alt={video.title} className="w-full h-[146px] object-cover" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white fill-white" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 flex-1">
                          <h3 className="font-serif font-bold text-xs line-clamp-2 whitespace-normal">{video.title}</h3>
                          {video.date && <p className="text-[10px] text-muted-foreground mt-1">{video.date}</p>}
                        </div>
                        <div className="px-3 pb-3">
                          <button
                            className="text-xs font-bold text-white bg-[#B4A597] hover:bg-[#a39487] px-4 py-1.5 rounded-[3px] transition-colors"
                            onClick={() => window.open(video.url, "_blank")}
                            data-testid={`button-watch-youtube-${video.videoId}`}
                          >WATCH ON YOUTUBE</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
              </div>

              <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                {youtubeVideos.slice(0, 6).map((video) => (
                  <div
                    key={video.videoId}
                    className="border border-border/50 bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                    data-testid={`card-video-desktop-${video.videoId}`}
                  >
                    <div className="relative cursor-pointer" onClick={() => window.open(video.url, "_blank")}>
                      <img src={video.thumbnail} alt={video.title} className="w-full h-[140px] object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 flex-1">
                      <h3 className="font-serif font-bold text-sm line-clamp-2">{video.title}</h3>
                      {video.date && <p className="text-xs text-muted-foreground mt-1">{video.date}</p>}
                    </div>
                    <div className="px-3 pb-3">
                      <button
                        className="text-xs font-bold text-white bg-[#B4A597] hover:bg-[#a39487] px-4 py-1.5 rounded-[3px] transition-colors"
                        onClick={() => window.open(video.url, "_blank")}
                        data-testid={`button-watch-youtube-desktop-${video.videoId}`}
                      >WATCH ON YOUTUBE</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
