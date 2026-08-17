import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

/**
 * The floating button that opens the dedicated chat screen. It carries the
 * unread count across the app so a team reply is noticed without the devotee
 * having to open the screen.
 */

const VISITOR_KEY = "sringeri_chat_visitor_id";
const POLL_MS = 60000;

export default function ChatLauncher() {
  const [location, navigate] = useLocation();
  const { getToken } = useAuth();
  const [unread, setUnread] = useState(0);
  const [agentOnline, setAgentOnline] = useState(false);
  const visitorRef = useRef<string>("");

  const refresh = useCallback(async () => {
    let visitorId = visitorRef.current;
    if (!visitorId) {
      try { visitorId = localStorage.getItem(VISITOR_KEY) || ""; } catch { visitorId = ""; }
      visitorRef.current = visitorId;
    }
    // Nothing to count until the visitor has actually started a conversation.
    if (!visitorId) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch { /* guests are fine */ }
      const res = await fetch("/api/live-chat/conversations", {
        method: "POST",
        headers,
        body: JSON.stringify({ visitorId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setAgentOnline(!!data.agentOnline);
      setUnread((data.conversations || []).reduce((sum: number, c: any) => sum + (c.unreadForVisitor || 0), 0));
    } catch { /* transient blips are ignored */ }
  }, [getToken]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, location]);

  if (location.startsWith("/chat")) return null;

  return (
    <button
      onClick={() => navigate("/chat")}
      className="fixed bottom-24 lg:bottom-8 right-4 z-50 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors"
      aria-label="Open chat"
      data-testid="button-open-chat"
    >
      <MessageCircle className="h-6 w-6 text-white" />
      {agentOnline && <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />}
      {unread > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center"
          data-testid="badge-chat-unread"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
