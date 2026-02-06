import { useEffect, useState } from "react";
import ServiceIcon from "@/components/service-icon";
import { ONLINE_SERVICES, RESOURCES } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, Info, Megaphone, Play } from "lucide-react";
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
  const isDesktop = useMedia('(min-width: 768px)', false);
  const { profile, user } = useAuth();
  const [todayDetails, setTodayDetails] = useState<TodayDetails | null>(null);
  const [panchangaLang, setPanchangaLang] = useState<'en' | 'kn'>('en');
  const [sringeriEvents, setSringeriEvents] = useState<SringeriEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
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
           
           {/* Recent Events */}
           <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl">Recent Events</h2>
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

        {announcements.length > 0 && (
          <div className="mt-3 px-4 md:px-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[#ff6600]" />
                  <h2 className="text-lg font-bold font-serif" data-testid="text-announcements-heading">Announcements</h2>
                </div>
              </div>

              <div className="md:hidden">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-3 pb-2">
                    {announcements.map((item) => (
                      <div
                        key={item.id}
                        className="w-[220px] shrink-0 rounded-xl border border-border/50 bg-card flex flex-col justify-between hover:shadow-md transition-shadow"
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
                            className="text-xs font-bold text-white bg-neutral-700 hover:bg-neutral-800 px-4 py-1.5 rounded transition-colors"
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

              <div className="hidden md:block">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-4 pb-2">
                    {announcements.map((item) => (
                      <div
                        key={item.id}
                        className="w-[260px] shrink-0 rounded-xl border border-border/50 bg-card flex flex-col justify-between hover:shadow-md transition-shadow"
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
                            className="text-xs font-bold text-white bg-neutral-700 hover:bg-neutral-800 px-4 py-1.5 rounded transition-colors"
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
          <div className="mt-3 px-4 md:px-6 pb-3">
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-bold font-serif" data-testid="text-youtube-heading">Latest Videos</h2>
                </div>
                <a href="https://www.youtube.com/@SharadaPeetham" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium" data-testid="link-youtube-channel">View Channel</a>
              </div>

              <div className="md:hidden">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-3 pb-2">
                    {youtubeVideos.map((video) => (
                      <div
                        key={video.videoId}
                        className="w-[260px] shrink-0 rounded-xl border border-border/50 bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => window.open(video.url, "_blank")}
                        data-testid={`card-video-${video.videoId}`}
                      >
                        <div className="relative">
                          <img src={video.thumbnail} alt={video.title} className="w-full h-[146px] object-cover" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white fill-white" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-serif font-bold text-xs line-clamp-2 whitespace-normal">{video.title}</h3>
                          {video.date && <p className="text-[10px] text-muted-foreground mt-1">{video.date}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
              </div>

              <div className="hidden md:grid md:grid-cols-3 gap-4">
                {youtubeVideos.slice(0, 6).map((video) => (
                  <div
                    key={video.videoId}
                    className="rounded-xl border border-border/50 bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => window.open(video.url, "_blank")}
                    data-testid={`card-video-desktop-${video.videoId}`}
                  >
                    <div className="relative">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-[140px] object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-serif font-bold text-sm line-clamp-2">{video.title}</h3>
                      {video.date && <p className="text-xs text-muted-foreground mt-1">{video.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

      </div>

      <footer className="mt-3 py-4 border-t border-border/50 bg-[#fcfbf7]">
        <div className="flex justify-center items-center gap-5 px-4">
          <a href="https://www.youtube.com/@SharadaPeetham" target="_blank" rel="noopener noreferrer" aria-label="YouTube" data-testid="link-social-youtube">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#ff6600]" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
          <a href="https://whatsapp.com/channel/0029VagEL8x6hENn0zfWSn2e" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" data-testid="link-social-whatsapp">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#ff6600]" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          </a>
          <a href="https://telegram.me/sringerimath" target="_blank" rel="noopener noreferrer" aria-label="Telegram" data-testid="link-social-telegram">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#ff6600]" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
          <a href="https://x.com/sringerimath" target="_blank" rel="noopener noreferrer" aria-label="X" data-testid="link-social-x">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#ff6600]" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://www.facebook.com/sringerimath/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" data-testid="link-social-facebook">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#ff6600]" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a href="https://www.instagram.com/sharadapeetham/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" data-testid="link-social-instagram">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#ff6600]" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.882 0 1.441 1.441 0 0 1 2.882 0z"/></svg>
          </a>
          <a href="https://www.sringeri.net/events" target="_blank" rel="noopener noreferrer" aria-label="Events Calendar" data-testid="link-social-calendar">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#ff6600]" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h5v5H7v-5z"/></svg>
          </a>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4 px-4">Sri Sringeri Sharada Peetham</p>
      </footer>
    </div>
  );
}
