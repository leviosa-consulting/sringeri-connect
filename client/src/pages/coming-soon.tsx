import { useEffect, useState } from "react";

export default function ComingSoon() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F0] via-[#F7F2EC] to-[#F0E8DC] flex flex-col items-center justify-center px-6 text-center" data-testid="coming-soon-page">
      <div className={`transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <img
          src="/assets/logo.webp"
          alt="Sri Sringeri Sharada Peetham"
          className="h-28 w-auto object-contain mx-auto mb-8 drop-shadow-md"
          data-testid="coming-soon-logo"
        />

        <h1 className="text-3xl font-serif font-bold text-foreground mb-3 tracking-tight" data-testid="coming-soon-title">
          Sri Sringeri Sharada Peetham
        </h1>

        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-5" />

        <p className="text-lg text-muted-foreground font-medium mb-2" data-testid="coming-soon-subtitle">
          Coming Soon
        </p>

        <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
          We are preparing something special for our devotees. Stay tuned.
        </p>

        <div className="mt-10 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/40"
              style={{
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
