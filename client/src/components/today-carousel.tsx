import { useState, useEffect, useCallback } from "react";
import { Sun, Sunrise, Sunset, Calendar, BookOpen, Quote, Image, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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

interface TodayCarouselProps {
  open: boolean;
  onClose: () => void;
  todayDetails: TodayDetails | null;
  formattedDate: string;
}

const SHLOKAS = [
  {
    sanskrit: "ब्रह्म सत्यं जगन्मिथ्या जीवो ब्रह्मैव नापरः",
    transliteration: "Brahma Satyam Jagan Mithyā Jīvo Brahmaiva Nāparaḥ",
    meaning: "Brahman alone is real, the world is appearance, and the individual soul is none other than Brahman.",
    source: "Vivekachudamani — Adi Shankaracharya",
  },
  {
    sanskrit: "भज गोविन्दं भज गोविन्दं गोविन्दं भज मूढमते",
    transliteration: "Bhaja Govindam Bhaja Govindam Govindam Bhaja Mūḍhamate",
    meaning: "Worship Govinda, worship Govinda, worship Govinda, O deluded mind!",
    source: "Bhaja Govindam — Adi Shankaracharya",
  },
  {
    sanskrit: "मनो बुद्ध्यहंकार चित्तानि नाहं न च श्रोत्रजिह्वे न च घ्राणनेत्रे",
    transliteration: "Mano Buddhyahaṅkāra Chittāni Nāham Na Cha Śrotra Jihve Na Cha Ghrāṇa Netre",
    meaning: "I am not the mind, intellect, ego, or memory. I am not the ear, tongue, nose, or eyes.",
    source: "Nirvana Shatakam — Adi Shankaracharya",
  },
  {
    sanskrit: "चिदानन्दरूपः शिवोऽहम् शिवोऽहम्",
    transliteration: "Chidānandarūpaḥ Śivo'ham Śivo'ham",
    meaning: "I am of the nature of consciousness and bliss. I am Shiva, I am Shiva.",
    source: "Nirvana Shatakam — Adi Shankaracharya",
  },
  {
    sanskrit: "सर्वं खल्विदं ब्रह्म",
    transliteration: "Sarvam Khalvidam Brahma",
    meaning: "All this is indeed Brahman.",
    source: "Chandogya Upanishad 3.14.1",
  },
];

const QUOTES = [
  {
    text: "The Guru is the means of realisation of the Absolute. This is the definite conclusion of all the scriptures. One must seek a Guru for Self-realisation.",
    attribution: "Jagadguru Sri Adi Shankaracharya",
  },
  {
    text: "Devotion to God and devotion to the Guru are one and the same. Through the grace of the Guru alone can one attain the highest knowledge.",
    attribution: "Jagadguru Sri Bharati Tirtha Mahaswamiji",
  },
  {
    text: "Let a man lift himself by himself; let him not degrade himself; for the Self alone is the friend of the self, and the Self alone is the enemy of the self.",
    attribution: "Bhagavad Gita 6.5",
  },
  {
    text: "When the mind is pure, joy follows like a shadow that never leaves. Cultivate the habit of daily prayer and contemplation.",
    attribution: "Jagadguru Sri Abhinava Vidyatirtha Mahaswamiji",
  },
  {
    text: "As the sun does not wait for anyone but rises at its appointed time, so too the spiritual aspirant must be regular in their practice without depending on external conditions.",
    attribution: "Jagadguru Sri Chandrashekhara Bharati Mahaswamiji",
  },
];

const DARSHAN_IMAGES = [
  "https://files.sringeri.net/assets/images/events/69a178e7f14f43.66954692.jpg",
  "https://files.sringeri.net/assets/images/events/6996bdf0407505.79408729.jpg",
  "https://files.sringeri.net/assets/images/events/698a98dae00e95.44226412.jpg",
  "https://files.sringeri.net/assets/images/events/6989c72ab7ad59.90272925.jpg",
  "https://files.sringeri.net/assets/images/events/698962c9c20cd2.80057319.jpg",
];

function getDailyIndex(arrayLength: number, offset = 0): number {
  const now = new Date();
  const start = new Date(2025, 0, 1);
  const dayIndex = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return (dayIndex + offset) % arrayLength;
}

const SLIDE_LABELS = ["Panchanga", "Occasion", "Shloka", "Quote", "Darshan"];
const SLIDE_ICONS = [Calendar, Sparkles, BookOpen, Quote, Image];

export default function TodayCarousel({ open, onClose, todayDetails, formattedDate }: TodayCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const onSelect = useCallback(() => {
    if (!api) return;
    setActiveIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.on("select", onSelect);
    api.on("pointerDown", () => setIsUserInteracting(true));
    api.on("pointerUp", () => {
      setTimeout(() => setIsUserInteracting(false), 8000);
    });
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!api || !open || isUserInteracting) return;
    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [api, open, isUserInteracting]);

  useEffect(() => {
    if (open && api) {
      api.scrollTo(0, true);
      setActiveIndex(0);
      setIsUserInteracting(false);
    }
  }, [open, api]);

  const todayShloka = SHLOKAS[getDailyIndex(SHLOKAS.length)];
  const todayQuote = QUOTES[getDailyIndex(QUOTES.length, 3)];
  const todayImage = DARSHAN_IMAGES[getDailyIndex(DARSHAN_IMAGES.length, 1)];

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] bg-gradient-to-b from-[#FFF9F0] to-[#F0E6D6] flex flex-col p-0 [&>button:last-child]:top-3 [&>button:last-child]:right-4"
        data-testid="today-carousel-sheet"
      >
        <VisuallyHidden>
          <SheetTitle>Today's Spiritual Content</SheetTitle>
        </VisuallyHidden>

        <div className="flex items-center gap-2 px-5 pt-4 pb-2 shrink-0">
          {(() => {
            const Icon = SLIDE_ICONS[activeIndex];
            return <Icon className="w-4 h-4 text-primary" />;
          })()}
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">{SLIDE_LABELS[activeIndex]}</span>
        </div>

        <div className="w-12 h-1 bg-foreground/15 rounded-full mx-auto mb-3 shrink-0" />

        <div className="flex-1 overflow-hidden">
          <Carousel
            opts={{ loop: true, skipSnaps: false }}
            setApi={setApi}
            className="h-full"
          >
            <CarouselContent className="-ml-0 h-full">
              <CarouselItem className="pl-0 px-5">
                <PanchangaSlide todayDetails={todayDetails} formattedDate={formattedDate} />
              </CarouselItem>
              <CarouselItem className="pl-0 px-5">
                <OccasionSlide todayDetails={todayDetails} formattedDate={formattedDate} />
              </CarouselItem>
              <CarouselItem className="pl-0 px-5">
                <ShlokaSlide shloka={todayShloka} />
              </CarouselItem>
              <CarouselItem className="pl-0 px-5">
                <QuoteSlide quote={todayQuote} />
              </CarouselItem>
              <CarouselItem className="pl-0 px-5">
                <DarshanSlide imageUrl={todayImage} />
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>

        <div className="flex justify-center gap-2 py-4 shrink-0">
          {SLIDE_LABELS.map((label, idx) => (
            <button
              key={label}
              onClick={() => {
                api?.scrollTo(idx);
                setIsUserInteracting(true);
                setTimeout(() => setIsUserInteracting(false), 8000);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeIndex ? "w-6 bg-primary" : "w-2 bg-foreground/20"
              }`}
              data-testid={`dot-today-${label.toLowerCase()}`}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PanchangaSlide({ todayDetails, formattedDate }: { todayDetails: TodayDetails | null; formattedDate: string }) {
  if (!todayDetails) return null;

  const details = [
    { labelEn: "Samvatsara", labelKn: "ಸಂವತ್ಸರ", valueEn: todayDetails.samvatsara, valueKn: todayDetails.samvatsaraK },
    { labelEn: "Chandra Masa", labelKn: "ಚಂದ್ರ ಮಾಸ", valueEn: todayDetails.chandraMasa, valueKn: todayDetails.chandraMasaK },
    { labelEn: "Tithi", labelKn: "ತಿಥಿ", valueEn: todayDetails.tithi, valueKn: todayDetails.tithiK },
    { labelEn: "Nakshatra", labelKn: "ನಕ್ಷತ್ರ", valueEn: todayDetails.nakshatra, valueKn: todayDetails.nakshatraK },
  ];

  return (
    <div className="flex flex-col h-full pb-2" data-testid="slide-panchanga">
      <div className="text-center mb-4">
        <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-2">{formattedDate}</div>
        {todayDetails.todayWebsiteKannada && (
          <div className="text-xl font-serif text-foreground leading-relaxed" style={{ fontFamily: "'Noto Serif Kannada', 'Merriweather', serif" }}>
            {todayDetails.todayWebsiteKannada}
          </div>
        )}
        {todayDetails.todayWebsiteEnglish && (
          <div className="text-sm text-foreground/60 mt-1">{todayDetails.todayWebsiteEnglish}</div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-2" />

      <div className="grid grid-cols-2 gap-3 mt-2">
        {details.map((d) => (
          <div key={d.labelEn} className="bg-white/60 rounded-xl p-3 text-center border border-primary/8">
            <div className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1">{d.labelEn}</div>
            <div className="text-base font-serif font-bold text-foreground">{d.valueEn}</div>
            {d.valueKn && (
              <div className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: "'Noto Serif Kannada', serif" }}>{d.valueKn}</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 text-center">
        <a
          href="https://sandhyakala.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary font-medium hover:underline"
          data-testid="link-sandhya-kala-carousel"
        >
          Sandhya Kala Details →
        </a>
      </div>
    </div>
  );
}

function OccasionSlide({ todayDetails, formattedDate }: { todayDetails: TodayDetails | null; formattedDate: string }) {
  const hasOccasion = todayDetails?.occasionK || todayDetails?.occasion;

  return (
    <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-occasion">
      {hasOccasion ? (
        <>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">{formattedDate}</div>
          {todayDetails?.occasionK && (
            <div className="text-xl font-serif text-foreground leading-relaxed mb-3 px-2" style={{ fontFamily: "'Noto Serif Kannada', 'Merriweather', serif" }}>
              {todayDetails.occasionK}
            </div>
          )}
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-3" />
          {todayDetails?.occasion && (
            <div className="text-sm text-foreground/70 leading-relaxed px-4">
              {todayDetails.occasion}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4">
            <Sun className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">{formattedDate}</div>
          <div className="text-lg font-serif text-foreground mb-2">A Blessed Day</div>
          <div className="text-sm text-foreground/60 px-6 leading-relaxed">
            No special occasion today. A peaceful day for prayer, contemplation, and devotion to Sri Sharadamba.
          </div>
        </>
      )}
    </div>
  );
}

function ShlokaSlide({ shloka }: { shloka: typeof SHLOKAS[0] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-shloka">
      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-4">Shloka of the Day</div>

      <div className="relative px-4 mb-4">
        <div className="absolute -top-3 left-2 text-5xl text-primary/15 font-serif leading-none">"</div>
        <div className="text-2xl font-serif text-foreground leading-relaxed" style={{ fontFamily: "'Noto Serif Devanagari', 'Merriweather', serif" }}>
          {shloka.sanskrit}
        </div>
        <div className="absolute -bottom-4 right-2 text-5xl text-primary/15 font-serif leading-none rotate-180">"</div>
      </div>

      <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary/30 to-transparent my-3" />

      <div className="text-xs text-primary/80 italic mb-3 px-6 leading-relaxed">
        {shloka.transliteration}
      </div>

      <div className="text-sm text-foreground/70 px-6 leading-relaxed mb-4">
        {shloka.meaning}
      </div>

      <div className="text-[10px] text-foreground/40 font-medium uppercase tracking-wider">
        {shloka.source}
      </div>
    </div>
  );
}

function QuoteSlide({ quote }: { quote: typeof QUOTES[0] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-quote">
      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-6">Quote of the Day</div>

      <div className="relative px-2">
        <div className="absolute -top-4 -left-1 text-6xl text-primary/10 font-serif leading-none select-none">"</div>
        <p className="text-lg font-serif text-foreground leading-relaxed italic px-4">
          {quote.text}
        </p>
        <div className="absolute -bottom-6 -right-1 text-6xl text-primary/10 font-serif leading-none rotate-180 select-none">"</div>
      </div>

      <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary/30 to-transparent my-5" />

      <div className="text-xs text-foreground/50 font-medium">
        — {quote.attribution}
      </div>
    </div>
  );
}

function DarshanSlide({ imageUrl }: { imageUrl: string }) {
  const sandhyaTimes = [
    { label: "Prātaḥ Sandhyā", labelKn: "ಪ್ರಾತಃ ಸಂಧ್ಯಾ", time: "5:45 AM", icon: Sunrise },
    { label: "Mādhyāhnika", labelKn: "ಮಾಧ್ಯಾಹ್ನಿಕ", time: "12:15 PM", icon: Sun },
    { label: "Sāyam Sandhyā", labelKn: "ಸಾಯಂ ಸಂಧ್ಯಾ", time: "6:30 PM", icon: Sunset },
  ];

  return (
    <div className="flex flex-col h-full pb-2" data-testid="slide-darshan">
      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-3 text-center">Darshan & Sandhya Kala</div>

      <div className="relative rounded-2xl overflow-hidden mb-4 h-[180px]">
        <img
          src={imageUrl}
          alt="Sringeri Temple"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-white text-sm font-serif font-bold">Sri Sharada Peetham, Sringeri</div>
          <div className="text-white/70 text-xs">Image of the Day</div>
        </div>
      </div>

      <div className="bg-white/60 rounded-xl border border-primary/8 p-4 space-y-3">
        <div className="text-xs font-semibold text-center text-foreground/60 uppercase tracking-wider mb-2">Prayer Times</div>
        {sandhyaTimes.map((st) => {
          const Icon = st.icon;
          return (
            <div key={st.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{st.label}</div>
                  <div className="text-[10px] text-foreground/40" style={{ fontFamily: "'Noto Serif Kannada', serif" }}>{st.labelKn}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground">{st.time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
