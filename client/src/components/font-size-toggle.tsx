import { useState, useRef, useEffect } from "react";
import { useFontSize, FontSizeOption, FONT_LABELS } from "@/contexts/font-size-context";
import { Check } from "lucide-react";

const OPTIONS: FontSizeOption[] = ["default", "large", "xlarge"];

export default function FontSizeToggle() {
  const { fontSize, setFontSize } = useFontSize();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative" style={{ fontSize: '16px' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-colors text-[#ff6600]"
        aria-label="Change font size"
        data-testid="button-font-size-toggle"
      >
        <span className="font-bold leading-none" style={{ fontSize: '14px' }}>Aa</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[140px] z-50">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { setFontSize(opt); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
              style={{ fontSize: '14px' }}
              data-testid={`button-font-${opt}`}
            >
              <span className={fontSize === opt ? "font-semibold text-primary" : "text-foreground"}>
                {FONT_LABELS[opt]}
              </span>
              {fontSize === opt && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
