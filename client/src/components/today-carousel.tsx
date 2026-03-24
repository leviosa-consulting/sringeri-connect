import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, BookOpen, Quote, Sparkles, BookOpenCheck, ArrowRight, Play, Video } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Link } from "wouter";

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

interface TodayQuiz {
  id: number;
  title: string;
  subtitle?: string | null;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  published: string;
  date: string | null;
  thumbnail: string;
  url: string;
}

interface TodayCarouselProps {
  open: boolean;
  onClose: () => void;
  todayDetails: TodayDetails | null;
  formattedDate: string;
  todayQuiz?: TodayQuiz | null;
  youtubeVideos?: YouTubeVideo[];
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

const GURU_VANI = [
  "Peace, contentment and joy is ingrained in every one of us. The Guru alone can unlock this treasure for us.",
  "Do not be disheartened by the spiritual darkness in the world around you. If you feel earnestly the urgency of escaping from the cycle of birth and death, seek your Guru.",
  "When the Sun sets and the darkness of night envelops the land, you don't stop your work, do you? Don't you light a lamp and get on with your normal activities? Likewise, ignore the spiritual gloom around and seek out a guiding torch, the realized Guru, who is waiting to help you.",
  "Surrender yourself entirely to a Guru. He will lead you to the goal.",
  "Even all-knowing Avatara Purushas sought out a Guru to conform to tradition and to convey the importance of the Guru. Sri Rama, Sri Krishna and Sri Adi Shankara Bhagavatpada sought Sri Vasishtha, Sri Sandeepani, and Sri Govindapada respectively.",
  "The Guru works only for the benefit of the world. He will never have any sense of doership or enjoyership. Hence a seeker should approach Him alone for guidance.",
  "A Guru is necessary to prescribe the particular course of action, sanctioned by the Shastras and suited to the disciple's qualification.",
  "Even a second of one's life can never be obtained again. If the entire life as a human is spent solely on sense pleasures, what greater loss can there ever be?",
  "The Lord has given a human birth. Do not wail when death is at the doorstep. Use the human birth well and achieve its purpose by taking to the spiritual path early.",
  "Do not waste time in frivolous pursuits. Orient yourself, under the guidance of the Guru, towards the goal of life elucidated in the Shastras.",
  "Birth as a human being is because of antecedent merits. Even then, following the established practices of one's elders and conducting oneself along the Vedic path are rare indeed. Make good use of such a precious human birth and attain Shreyas (greater good).",
  "Make the best use of this body by doing Seva to the Guru with a focussed mind and in a spirit of surrender.",
];

function getDailyIndex(arrayLength: number, offset = 0): number {
  const now = new Date();
  const start = new Date(2025, 0, 1);
  const dayIndex = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return (dayIndex + offset) % arrayLength;
}

const SLIDE_DURATION = 5000;

export default function TodayCarousel({ open, onClose, todayDetails, formattedDate, todayQuiz, youtubeVideos = [] }: TodayCarouselProps) {
  const hasQuiz = !!todayQuiz;
  const hasOccasion = !!(todayDetails?.occasionK || todayDetails?.occasion);
  const slideLabels: string[] = [];
  const slideIcons: (typeof Calendar)[] = [];
  slideLabels.push("Panchanga"); slideIcons.push(Calendar);
  if (hasOccasion) { slideLabels.push("Occasion"); slideIcons.push(Sparkles); }
  slideLabels.push("Stotra"); slideIcons.push(BookOpen);
  slideLabels.push("Guru Vani"); slideIcons.push(Quote);
  slideLabels.push("Anugraha"); slideIcons.push(Video);
  if (hasQuiz) { slideLabels.push("Quiz"); slideIcons.push(BookOpenCheck); }
  const SLIDE_LABELS = slideLabels;
  const SLIDE_ICONS = slideIcons;
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const pointerDownTimeRef = useRef<number>(0);
  const pointerDownXRef = useRef<number>(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setActiveIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.on("select", onSelect);
    onSelect();
    return () => { api.off("select", onSelect); };
  }, [api, onSelect]);

  useEffect(() => {
    if (!open || !api) return;
    setProgress(0);
    startTimeRef.current = performance.now();
    pausedAtRef.current = 0;
  }, [activeIndex, open, api]);

  useEffect(() => {
    if (!open || !api || isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (pausedAtRef.current > 0) {
      startTimeRef.current = performance.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
    }

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(elapsed / SLIDE_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        api.scrollNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [open, api, isPaused, activeIndex]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownTimeRef.current = performance.now();
    pointerDownXRef.current = e.clientX;
    pausedAtRef.current = performance.now() - startTimeRef.current;
    setIsPaused(true);
  }, []);

  const resumeAutoplay = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const holdDuration = performance.now() - pointerDownTimeRef.current;
    const dx = Math.abs(e.clientX - pointerDownXRef.current);

    const target = e.target as HTMLElement;
    const isInteractive = target.closest('a, button, [role="button"]');

    if (!isInteractive && holdDuration < 300 && dx < 10 && api) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      if (relX < 0.4) {
        api.scrollPrev();
      } else if (relX > 0.6) {
        api.scrollNext();
      }
    }
    resumeAutoplay();
  }, [api, resumeAutoplay]);

  const handlePointerCancel = useCallback(() => {
    resumeAutoplay();
  }, [resumeAutoplay]);

  useEffect(() => {
    if (open && api) {
      api.scrollTo(0, true);
      setActiveIndex(0);
      setProgress(0);
      setIsPaused(false);
      startTimeRef.current = performance.now();
      pausedAtRef.current = 0;
    }
  }, [open, api]);

  const goToSlide = useCallback((idx: number) => {
    if (!api) return;
    api.scrollTo(idx);
    setProgress(0);
    startTimeRef.current = performance.now();
    pausedAtRef.current = 0;
    setIsPaused(false);
  }, [api]);

  const todayShloka = SHLOKAS[getDailyIndex(SHLOKAS.length)];
  const todayGuruVani = GURU_VANI[getDailyIndex(GURU_VANI.length, 3)];
  const latestVideo = youtubeVideos.length > 0 ? youtubeVideos[0] : null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl h-[75vh] max-h-[85vh] bg-gradient-to-b from-[#FFF9F0] to-[#F0E6D6] flex flex-col p-0 [&>button:last-child]:top-3 [&>button:last-child]:right-4"
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

        <div className="flex gap-1 px-5 mb-3 shrink-0">
          {SLIDE_LABELS.map((label, idx) => (
            <button
              key={label}
              onClick={() => goToSlide(idx)}
              className="flex-1 h-[3px] rounded-full bg-foreground/10 overflow-hidden relative"
              data-testid={`progress-today-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                style={{
                  width: idx < activeIndex
                    ? "100%"
                    : idx === activeIndex
                      ? `${progress * 100}%`
                      : "0%",
                  transition: idx === activeIndex ? "none" : "width 0.3s ease",
                }}
              />
            </button>
          ))}
        </div>

        <div
          className="flex-1 min-h-0 overflow-hidden relative"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
        >
          <Carousel
            opts={{ loop: true, skipSnaps: false }}
            setApi={setApi}
            className="h-full"
          >
            <CarouselContent className="-ml-0 h-full">
              <CarouselItem className="pl-0 px-5">
                <PanchangaSlide todayDetails={todayDetails} formattedDate={formattedDate} />
              </CarouselItem>
              {hasOccasion && (
                <CarouselItem className="pl-0 px-5">
                  <OccasionSlide todayDetails={todayDetails} formattedDate={formattedDate} />
                </CarouselItem>
              )}
              <CarouselItem className="pl-0 px-5">
                <StotraSlide shloka={todayShloka} />
              </CarouselItem>
              <CarouselItem className="pl-0 px-5">
                <GuruVaniSlide quote={todayGuruVani} />
              </CarouselItem>
              <CarouselItem className="pl-0 px-5">
                <JagadguruAnugrahaSlide video={latestVideo} />
              </CarouselItem>
              {todayQuiz && (
                <CarouselItem className="pl-0 px-5">
                  <QuizSlide quiz={todayQuiz} onClose={onClose} />
                </CarouselItem>
              )}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="h-4 shrink-0" />
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
  return (
    <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-occasion">
      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-4">Occasion</div>
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
    </div>
  );
}

function StotraSlide({ shloka }: { shloka: typeof SHLOKAS[0] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-stotra">
      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-4">Stotra of the Day</div>

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

      <div className="text-[10px] text-foreground/40 font-medium uppercase tracking-wider mb-3">
        {shloka.source}
      </div>

      <a
        href="https://www.sringeri.net/stotras"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        data-testid="link-full-stotra"
      >
        View Full Stotra
        <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  );
}

function GuruVaniSlide({ quote }: { quote: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-guru-vani">
      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-6">Guru Vani</div>

      <div className="relative px-2">
        <div className="absolute -top-4 -left-1 text-6xl text-primary/10 font-serif leading-none select-none">"</div>
        <p className="text-lg font-serif text-foreground leading-relaxed italic px-4">
          {quote}
        </p>
        <div className="absolute -bottom-6 -right-1 text-6xl text-primary/10 font-serif leading-none rotate-180 select-none">"</div>
      </div>

      <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary/30 to-transparent my-5" />

      <div className="text-xs text-foreground/50 font-medium px-4 leading-relaxed">
        — Jagadguru Shankaracharya Sri Sri Bharati Tirtha Mahasannidhanam
      </div>
    </div>
  );
}

function QuizSlide({ quiz, onClose }: { quiz: TodayQuiz; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-quiz">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-amber-100 flex items-center justify-center mb-4">
        <BookOpenCheck className="w-8 h-8 text-primary" />
      </div>

      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">Today's Quiz</div>

      <h3 className="text-xl font-serif font-bold text-foreground mb-2 px-4 leading-snug">
        {quiz.title}
      </h3>

      {quiz.subtitle && (
        <p className="text-sm text-foreground/60 mb-4 px-6">{quiz.subtitle}</p>
      )}

      <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary/30 to-transparent my-3" />

      <p className="text-xs text-foreground/50 mb-6 px-8 leading-relaxed">
        Test your knowledge and earn streaks by taking the daily quiz.
      </p>

      <Link
        href={`/knowledge/${quiz.id}`}
        onClick={() => onClose()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary to-orange-500 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-xl active:scale-95 transition-all"
        data-testid="link-today-quiz"
      >
        Take the Quiz
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function JagadguruAnugrahaSlide({ video }: { video: YouTubeVideo | null }) {
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full pb-2 text-center" data-testid="slide-anugraha">
        <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-4">Jagadguru Anugraha</div>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
          <Video className="w-8 h-8 text-primary" />
        </div>
        <p className="text-sm text-foreground/60 px-6">Latest videos from Sri Sharada Peetham will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-2" data-testid="slide-anugraha">
      <div className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] mb-3 text-center">Jagadguru Anugraha</div>

      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative rounded-2xl overflow-hidden flex-1 min-h-0 group"
        data-testid="link-anugraha-video"
      >
        <img
          src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white text-sm font-serif font-bold leading-snug line-clamp-2 mb-1">
            {video.title}
          </h3>
          <div className="text-white/60 text-xs">Watch on YouTube</div>
        </div>
      </a>
    </div>
  );
}
