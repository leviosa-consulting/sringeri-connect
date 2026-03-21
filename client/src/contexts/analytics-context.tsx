import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./auth-context";
import { startTracking, trackPageView, setUserId } from "@/lib/analytics";

const AnalyticsContext = createContext<null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const cleanupRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      cleanupRef.current = startTracking();
      initializedRef.current = true;
    }
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    setUserId(user?.uid || null);
  }, [user?.uid]);

  useEffect(() => {
    if (location) {
      trackPageView(location);
    }
  }, [location]);

  return (
    <AnalyticsContext.Provider value={null}>
      {children}
    </AnalyticsContext.Provider>
  );
}
