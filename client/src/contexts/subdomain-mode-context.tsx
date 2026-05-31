import { createContext, useContext, useMemo } from "react";

export type ServiceMode = "seva" | "donate" | "yatri" | null;

export const SERVICE_ROUTES: Record<NonNullable<ServiceMode>, string> = {
  seva: "/seva",
  donate: "/donation",
  yatri: "/accommodation",
};

export const SERVICE_LABELS: Record<NonNullable<ServiceMode>, string> = {
  seva: "Seva",
  donate: "Donate",
  yatri: "Yatri",
};

interface SubdomainModeContextValue {
  mode: ServiceMode;
  isServicesMode: boolean;
  homeRoute: string;
}

const SubdomainModeContext = createContext<SubdomainModeContextValue>({
  mode: null,
  isServicesMode: false,
  homeRoute: "/home",
});

function detectMode(): ServiceMode {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  if (hostname.startsWith("seva.")) return "seva";
  if (hostname.startsWith("donate.")) return "donate";
  if (hostname.startsWith("yatri.")) return "yatri";

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const devMode = params.get("devMode");
  if (devMode === "seva" || devMode === "donate" || devMode === "yatri") return devMode;

  return null;
}

export function SubdomainModeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<SubdomainModeContextValue>(() => {
    const mode = detectMode();
    return {
      mode,
      isServicesMode: mode !== null,
      homeRoute: mode ? SERVICE_ROUTES[mode] : "/home",
    };
  }, []);

  return (
    <SubdomainModeContext.Provider value={value}>
      {children}
    </SubdomainModeContext.Provider>
  );
}

export function useSubdomainMode() {
  return useContext(SubdomainModeContext);
}
