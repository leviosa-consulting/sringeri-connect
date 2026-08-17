import { useEffect, useState } from "react";
import sringeriIcon from "@/assets/sringeri-icon.png";

const ADVAITA_SHARADA_URL = "https://www.advaitasharada.sringeri.net/";

export default function AsLaunch() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #4a0d0d 0%, #6e1717 45%, #450c0c 100%)" }}
      data-testid="aslaunch-page"
    >
      {/* Diagonal light streaks, matching the external splash page's texture */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.08) 48%, transparent 56%), linear-gradient(115deg, transparent 55%, rgba(255,255,255,0.05) 62%, transparent 70%)",
        }}
      />

      <div
        className={`relative z-10 w-full max-w-sm rounded-2xl border border-amber-400/40 shadow-2xl px-8 py-10 text-center transition-all duration-1000 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
        style={{ background: "linear-gradient(180deg, rgba(61,11,11,0.9), rgba(37,7,7,0.9))" }}
      >
        <img
          src={sringeriIcon}
          alt="Sri Sringeri Sharada Peetham"
          className="h-16 w-16 object-contain mx-auto mb-4 drop-shadow-lg"
          data-testid="aslaunch-logo"
        />

        <p
          className="text-xs text-amber-200/70 italic mb-3 tracking-wide"
          style={{ fontFamily: "'Noto Serif Devanagari', serif" }}
          data-testid="text-aslaunch-tagline"
        >
          अद्वैतं परमार्थतः
        </p>

        <h1
          className="text-4xl sm:text-5xl font-bold text-amber-50 mb-3 leading-tight"
          style={{ fontFamily: "'Noto Serif Devanagari', serif" }}
          data-testid="aslaunch-title"
        >
          अद्वैतशारदा
        </h1>

        <p
          className="text-sm text-amber-100/80 mb-5"
          style={{ fontFamily: "'Noto Serif Devanagari', serif" }}
          data-testid="text-aslaunch-subtitle"
        >
          दक्षिणाम्नाय श्रीशारदापीठम्, श्रृंगेरी
        </p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-px bg-gradient-to-r from-transparent to-amber-400/50" />
          <div className="text-amber-400/70 text-xs">✦</div>
          <div className="w-10 h-px bg-gradient-to-l from-transparent to-amber-400/50" />
        </div>

        {/* Launch button — replaces the external site's "शीघ्रम् आगच्छति…" (coming soon) line */}
        <a
          href={ADVAITA_SHARADA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-8 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[#4a0d0d] font-semibold text-base shadow-lg hover:shadow-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-200 mb-6"
          data-testid="button-aslaunch-launch"
        >
          Launch
        </a>

        <p
          className="text-xs text-amber-200/60"
          style={{ fontFamily: "'Noto Serif Devanagari', serif" }}
          data-testid="text-aslaunch-footer"
        >
          जगद्गुरुशङ्कराचार्यश्रीचरणयोः अनुग्रहेण
        </p>
      </div>
    </div>
  );
}
