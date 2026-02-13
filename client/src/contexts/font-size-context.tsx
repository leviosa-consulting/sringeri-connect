import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type FontSizeOption = "default" | "large" | "xlarge";

interface FontSizeContextType {
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
  label: string;
}

const FONT_SIZE_KEY = "sringeri-font-size";

const FONT_LABELS: Record<FontSizeOption, string> = {
  default: "Default",
  large: "Large",
  xlarge: "Extra Large",
};

const FONT_SCALE: Record<FontSizeOption, number> = {
  default: 100,
  large: 115,
  xlarge: 125,
};

const FontSizeContext = createContext<FontSizeContextType>({
  fontSize: "default",
  setFontSize: () => {},
  label: "Default",
});

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_KEY);
      if (saved && (saved === "default" || saved === "large" || saved === "xlarge")) {
        return saved as FontSizeOption;
      }
    } catch {}
    return "default";
  });

  useEffect(() => {
    const scale = FONT_SCALE[fontSize];
    document.documentElement.style.fontSize = scale === 100 ? "" : `${scale}%`;
    try {
      localStorage.setItem(FONT_SIZE_KEY, fontSize);
    } catch {}
  }, [fontSize]);

  const setFontSize = (size: FontSizeOption) => {
    setFontSizeState(size);
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, label: FONT_LABELS[fontSize] }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}

export { FONT_LABELS, FONT_SCALE };
