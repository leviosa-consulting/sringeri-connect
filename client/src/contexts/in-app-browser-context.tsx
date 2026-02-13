import { createContext, useContext, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, RotateCw, ExternalLink } from "lucide-react";

interface InAppBrowserContextType {
  openUrl: (url: string) => void;
}

const InAppBrowserContext = createContext<InAppBrowserContextType>({
  openUrl: () => {},
});

export function useInAppBrowser() {
  return useContext(InAppBrowserContext);
}

export function InAppBrowserProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const openUrl = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setIframeKey((k) => k + 1);
  }, []);

  const close = useCallback(() => {
    setUrl(null);
  }, []);

  const reload = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const openExternal = useCallback(() => {
    if (url) window.open(url, "_blank");
  }, [url]);

  return (
    <InAppBrowserContext.Provider value={{ openUrl }}>
      {children}
      {url && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col" data-testid="in-app-browser">
          <div className="flex items-center justify-between px-2 py-2 bg-white border-b border-border/50 shrink-0 safe-area-top">
            <button
              onClick={close}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
              data-testid="button-browser-close"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            <div className="flex-1 mx-2 text-center">
              <p className="text-xs text-muted-foreground truncate max-w-[200px] mx-auto">
                {(() => {
                  try {
                    return new URL(url).hostname;
                  } catch {
                    return url;
                  }
                })()}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={reload}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Reload"
                data-testid="button-browser-reload"
              >
                <RotateCw className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={openExternal}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Open in browser"
                data-testid="button-browser-external"
              >
                <ExternalLink className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </div>

          <iframe
            key={iframeKey}
            src={url}
            className="flex-1 w-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            allow="autoplay; fullscreen"
            data-testid="iframe-browser"
          />
        </div>
      )}
    </InAppBrowserContext.Provider>
  );
}
