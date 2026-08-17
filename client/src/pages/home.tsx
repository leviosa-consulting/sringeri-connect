import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ServiceIcon from "@/components/service-icon";
import { ONLINE_SERVICES, RESOURCES } from "@/lib/constants";
import { Info, Globe, BookOpen, ChevronDown, AlertTriangle, X, Loader2, Bell, ChevronRight, Languages, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import FontSizeToggle from "@/components/font-size-toggle";
import TodayDrawer from "@/components/today-drawer";
import DharmaPointsCard from "@/components/dharma-points-card";
import guruBanner from "@assets/footer-collage-web_(1)_1773382448292.webp";
import calendarBg from "@assets/background-writing-web_1770978468122.jpg";

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
  const { profile, user, avatarUrl, pendingOrderIds, clearPendingPrompt, getToken } = useAuth();
  const { toast } = useToast();
  const [pendingChecking, setPendingChecking] = useState(false);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const [todayDetails, setTodayDetails] = useState<TodayDetails | null>(null);
  const [panchangaLang, setPanchangaLang] = useState<'en' | 'kn'>('en');
  const [showKannada, setShowKannada] = useState(false);
  const [todaySheetOpen, setTodaySheetOpen] = useState(false);
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

  // Allow other pages (e.g. the Daily Practice hub) to deep-link into the
  // Today drawer via a query param, since it lives only in Home's state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openToday") === "1") {
      setTodaySheetOpen(true);
      params.delete("openToday");
      const rest = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  }, []);

  const checkPendingTransactions = async () => {
    if (!pendingOrderIds.length || pendingChecking) return;
    setPendingChecking(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/user/reconcile-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      clearPendingPrompt();
      const parts: string[] = [];
      if (data.reconciled) parts.push(`${data.reconciled} confirmed & reconciled`);
      if (data.markedFailed) parts.push(`${data.markedFailed} marked as failed`);
      if (data.pending) parts.push(`${data.pending} still pending`);
      if (data.errors) parts.push(`${data.errors} errors`);
      toast({
        title: "Transaction status checked",
        description: parts.length ? parts.join(", ") : "All transactions checked",
      });
    } catch {
      toast({ title: "Check failed", description: "Could not check transaction status", variant: "destructive" });
    } finally {
      setPendingChecking(false);
    }
  };

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
            <div className="flex items-center gap-1.5">
              {todayDetails?.todayWebsiteKannada && (
                <button
                  onClick={() => setShowKannada((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 h-8 rounded-full text-xs font-semibold transition-colors ${showKannada ? "bg-primary/10 text-primary" : "hover:bg-black/5 text-[#ff6600]"}`}
                  aria-pressed={showKannada}
                  aria-label={showKannada ? "Hide Kannada text" : "Show Kannada text"}
                  data-testid="button-toggle-kannada"
                >
                  <Languages className="w-3.5 h-3.5" />
                  ಕನ್ನಡ
                </button>
              )}
              <FontSizeToggle />
            </div>
          </div>
        </div>

        {/* Hindu Calendar Strip */}
        {todayDetails && (
          <div className="py-4 px-6 text-center space-y-2.5" data-testid="card-today-calendar">
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1">
              {showKannada && todayDetails.todayWebsiteKannada && (
                <div className="text-lg font-serif text-foreground leading-relaxed" style={{ fontFamily: "'Noto Serif Kannada', 'Merriweather', serif" }} data-testid="text-calendar-kannada">{todayDetails.todayWebsiteKannada}</div>
              )}
              {todayDetails.todayWebsiteEnglish && (
                <div className={`text-[#443b31] font-semibold text-[16px] ${showKannada ? "mt-1" : ""}`} data-testid="text-calendar-english">{todayDetails.todayWebsiteEnglish}</div>
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

        {/* Occasion of the Day — decorated section, only when present */}
        {todayDetails && (todayDetails.occasion || todayDetails.occasionK) && (
          <div className="mx-4 mb-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-amber-50 to-primary/5 px-4 py-3" data-testid="section-home-occasion">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Occasion Today
            </div>
            {todayDetails.occasionK && (
              <div
                className="text-base font-serif text-foreground leading-relaxed"
                style={{ fontFamily: "'Noto Serif Kannada', 'Merriweather', serif" }}
                data-testid="text-home-occasion-kannada"
              >
                {todayDetails.occasionK}
              </div>
            )}
            {todayDetails.occasion && (
              <div className="text-sm text-foreground/70 leading-relaxed mt-0.5" data-testid="text-home-occasion-english">{todayDetails.occasion}</div>
            )}
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
      {/* Today Drawer */}
      <TodayDrawer
        open={todaySheetOpen}
        onClose={() => setTodaySheetOpen(false)}
        todayDetails={todayDetails}
        formattedDate={formatTodayDate()}
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
      {pendingOrderIds.length > 0 && !user?.isAnonymous && (
        <div className="px-4 lg:px-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200" data-testid="banner-pending-transactions">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {pendingOrderIds.length} pending transaction{pendingOrderIds.length > 1 ? "s" : ""} found
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Some recent payments may not have been confirmed. Tap below to check and update their status.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={checkPendingTransactions}
                  disabled={pendingChecking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
                  data-testid="button-check-pending"
                >
                  {pendingChecking ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…</>
                  ) : "Check Status"}
                </button>
                <button
                  onClick={clearPendingPrompt}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                  data-testid="button-dismiss-pending"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={clearPendingPrompt}
              className="p-1 hover:bg-amber-100 rounded text-amber-600"
              data-testid="button-close-pending-banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 px-4 lg:px-6">
        
        {/* Main Content Column */}
        <div className="lg:col-span-12 space-y-8">
          
          {/* Dharma Points summary */}
          <DharmaPointsCard onClick={() => setTodaySheetOpen(true)} />

          {/* Online Services */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#ff6600]" />
                Online Services
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-1 bg-card rounded-xl border border-border/50 py-2">
              {ONLINE_SERVICES.filter((s) => !(s.id === "donate" && isIOS)).map((service) => (
                  <ServiceIcon 
                    key={service.id}
                    {...service}
                    onClick={() => {
                      if (service.id === "accommodation") setLocation("/accommodation");
                      if (service.id === "donate") setLocation("/donation");
                      if (service.id === "seva") setLocation("/seva");
                    }}
                  />
              ))}
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

          {/* Latest Updates entry point */}
          <section>
            <button
              onClick={() => setLocation("/updates")}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-md transition-all text-left"
              data-testid="link-home-updates"
            >
              <div className="w-10 h-10 rounded-full bg-[#ff6600]/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-[#ff6600]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif font-bold text-base leading-tight">Latest Updates</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Events, announcements and videos from the Peetham
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          </section>

        </div>

      </div>
    </div>
  );
}
