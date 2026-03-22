import { useEffect, useState } from "react";

export default function ComingSoon() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F0] via-[#F7F2EC] to-[#EDE4D8] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden" data-testid="coming-soon-page">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23996633' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className={`relative z-10 transition-all duration-1000 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="relative mb-8">
          <div className="absolute -inset-6 bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-2xl" />
          <img
            src="/assets/logo.webp"
            alt="Sri Sringeri Sharada Peetham"
            className="h-32 w-auto object-contain mx-auto relative drop-shadow-lg"
            data-testid="coming-soon-logo"
          />
        </div>

        <p className="text-sm text-primary/50 italic mb-6 leading-relaxed max-w-xs mx-auto" style={{ fontFamily: "'Noto Serif Devanagari', serif" }}>
          {"श्री शारदाम्बायै नमः"}
        </p>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-2 tracking-tight" data-testid="coming-soon-title">
          Sri Sringeri Sharada Peetham
        </h1>

        <p className="text-sm text-muted-foreground/80 font-medium mb-1">
          Dakshinamnaya Sri Sharada Peetham
        </p>

        <div className="flex items-center justify-center gap-3 my-6">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-primary/30" />
        </div>

        <div className="space-y-2.5 mb-8">
          <p className="text-lg font-serif font-semibold text-foreground" data-testid="coming-soon-subtitle">
            Devotee Services Portal
          </p>
          <p className="text-base text-primary font-medium">
            Coming Soon
          </p>
          <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto leading-relaxed">
            With the blessings of Jagadguru Shankaracharya, we are preparing a digital seva platform for devotees worldwide.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-1 h-1 rounded-full bg-primary/30 animate-[glow_2s_ease-in-out_infinite]" />
          <div className="w-1 h-1 rounded-full bg-primary/30 animate-[glow_2s_ease-in-out_infinite_0.5s]" />
          <div className="w-1 h-1 rounded-full bg-primary/30 animate-[glow_2s_ease-in-out_infinite_1s]" />
        </div>
      </div>

      <style>{`
        @keyframes glow {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
