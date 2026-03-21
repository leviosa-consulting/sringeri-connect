type AnalyticsEventData = {
  userId?: string | null;
  sessionId: string;
  eventType: "page_view" | "click" | "scroll" | "time_spent";
  page: string;
  elementId?: string | null;
  elementText?: string | null;
  value?: number | null;
  metadata?: Record<string, any> | null;
};

let sessionId: string | null = null;
let eventBuffer: AnalyticsEventData[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | null = null;
let currentPage = "";
let pageEntryTime = 0;
let maxScrollDepth = 0;
let scrollHandler: (() => void) | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  const stored = sessionStorage.getItem("analytics_sid");
  if (stored) {
    sessionId = stored;
    return stored;
  }
  const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStorage.setItem("analytics_sid", id);
  sessionId = id;
  return id;
}

function getDeviceInfo() {
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    deviceType: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
    userAgent: navigator.userAgent.substring(0, 150),
  };
}

function addEvent(event: Omit<AnalyticsEventData, "sessionId">) {
  eventBuffer.push({
    ...event,
    sessionId: getSessionId(),
    userId: event.userId || currentUserId,
  });
}

function flushEvents() {
  if (eventBuffer.length === 0) return;
  const events = [...eventBuffer];
  eventBuffer = [];

  const body = JSON.stringify({ events });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
  } else {
    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

function sendPageLeaveEvents() {
  if (currentPage && pageEntryTime > 0) {
    const timeSpent = Math.round((Date.now() - pageEntryTime) / 1000);
    if (timeSpent > 0 && timeSpent < 7200) {
      addEvent({ eventType: "time_spent", page: currentPage, value: timeSpent });
    }
  }
  if (currentPage && maxScrollDepth > 0) {
    addEvent({ eventType: "scroll", page: currentPage, value: maxScrollDepth });
  }
  maxScrollDepth = 0;
  pageEntryTime = 0;
}

function updateScrollDepth() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1
  );
  const depth = Math.min(100, Math.round((scrollTop / docHeight) * 100));
  if (depth > maxScrollDepth) maxScrollDepth = depth;
}

function handleGlobalClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target) return;

  const interactive = target.closest("[data-testid], button, a, [role='button'], input[type='submit']");
  if (!interactive) return;

  const el = interactive as HTMLElement;
  const elementId = el.getAttribute("data-testid") ||
    el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + (el.className ? `.${el.className.split(" ")[0]}` : "");
  const elementText = (el.textContent || el.getAttribute("aria-label") || "").trim().substring(0, 200);

  addEvent({
    eventType: "click",
    page: currentPage || window.location.pathname,
    elementId: elementId || null,
    elementText: elementText || null,
  });
}

export function setUserId(uid: string | null) {
  currentUserId = uid;
}

export function trackPageView(page: string) {
  sendPageLeaveEvents();

  currentPage = page;
  pageEntryTime = Date.now();
  maxScrollDepth = 0;

  addEvent({
    eventType: "page_view",
    page,
    metadata: {
      ...getDeviceInfo(),
      referrer: document.referrer || null,
    },
  });
}

export function startTracking() {
  document.addEventListener("click", handleGlobalClick, { capture: true, passive: true });

  scrollHandler = updateScrollDepth;
  window.addEventListener("scroll", scrollHandler, { passive: true });

  flushTimer = setInterval(flushEvents, 10000);

  const handleUnload = () => {
    sendPageLeaveEvents();
    flushEvents();
  };

  window.addEventListener("beforeunload", handleUnload);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendPageLeaveEvents();
      flushEvents();
    }
  });

  return () => {
    document.removeEventListener("click", handleGlobalClick, { capture: true } as any);
    if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
    if (flushTimer) clearInterval(flushTimer);
    window.removeEventListener("beforeunload", handleUnload);
  };
}
