import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Send, Bot, Loader2, Headset, MessageCircle, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";

/**
 * Live Chat: a single thread that starts with the Sringeri Sahayak AI bot,
 * escalates to a human agent when one is online, and otherwise captures the
 * devotee's concern for an emailed reply within 2–4 hours.
 */

type ChatStatus = "bot" | "waiting" | "live" | "offline_pending" | "closed";

interface ChatLine {
  id: number;
  author: "user" | "bot" | "agent" | "system";
  authorName: string | null;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  status: ChatStatus;
  name: string | null;
  email: string | null;
  phone: string | null;
  assignedAgentName: string | null;
}

interface SuggestedAction {
  label: string;
  action: string;
}

const VISITOR_KEY = "sringeri_chat_visitor_id";
const POLL_MS = 3000;

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `v${Date.now()}${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `v${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      return;
    }

    const parts: React.ReactNode[] = [];
    let remaining = line;
    let partKey = 0;

    while (remaining.length > 0) {
      const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const italicMatch = remaining.match(/_([^_]+)_/);

      let firstMatch: { type: string; index: number; full: string; content: string; url?: string } | null = null;

      if (linkMatch && linkMatch.index !== undefined) {
        firstMatch = { type: "link", index: linkMatch.index, full: linkMatch[0], content: linkMatch[1], url: linkMatch[2] };
      }
      if (boldMatch && boldMatch.index !== undefined && (!firstMatch || boldMatch.index < firstMatch.index)) {
        firstMatch = { type: "bold", index: boldMatch.index, full: boldMatch[0], content: boldMatch[1] };
      }
      if (italicMatch && italicMatch.index !== undefined && (!firstMatch || italicMatch.index < firstMatch.index)) {
        firstMatch = { type: "italic", index: italicMatch.index, full: italicMatch[0], content: italicMatch[1] };
      }

      if (!firstMatch) {
        if (remaining) parts.push(<span key={partKey++}>{remaining}</span>);
        break;
      }

      if (firstMatch.index > 0) {
        parts.push(<span key={partKey++}>{remaining.substring(0, firstMatch.index)}</span>);
      }

      if (firstMatch.type === "link") {
        parts.push(
          <a key={partKey++} href={firstMatch.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
            {firstMatch.content}
          </a>
        );
      } else if (firstMatch.type === "bold") {
        parts.push(<strong key={partKey++}>{firstMatch.content}</strong>);
      } else {
        parts.push(<em key={partKey++} className="text-muted-foreground">{firstMatch.content}</em>);
      }

      remaining = remaining.substring(firstMatch.index + firstMatch.full.length);
    }

    elements.push(
      <div key={i} className={line.trimStart().startsWith("•") ? "pl-2 py-0.5" : "py-0.5"}>
        {parts}
      </div>
    );
  });

  return <div className="space-y-0">{elements}</div>;
}

/**
 * `botOnly` turns the widget into the quick-answers assistant that floats over
 * the dedicated chat screen: it never offers the team hand-off, because
 * reaching the team there means starting a proper conversation with a subject.
 */
export default function ChatbotWidget({ botOnly = false }: { botOnly?: boolean } = {}) {
  const { profile, devoteeData, getToken } = useAuth();
  const [, setLocation] = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  // Quick-topic chips offered alongside the assistant's latest reply — the
  // restored intro-bubble UI from the original rule-based chat (Task #170).
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [closingChat, setClosingChat] = useState(false);

  // Team is offline and no conversation exists yet: let the visitor choose
  // between quick AI answers and leaving an email for the team.
  const [needsChoice, setNeedsChoice] = useState(false);
  const [preEmailMode, setPreEmailMode] = useState(false);

  // Offline hand-off form
  const [showHandoffForm, setShowHandoffForm] = useState(false);
  const [hName, setHName] = useState("");
  const [hEmail, setHEmail] = useState("");
  const [hPhone, setHPhone] = useState("");
  const [hConcern, setHConcern] = useState("");
  const [handoffSubmitting, setHandoffSubmitting] = useState(false);

  const visitorIdRef = useRef<string>("");
  const lastIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; dragged: boolean } | null>(null);

  if (!visitorIdRef.current) visitorIdRef.current = getVisitorId();

  useEffect(() => {
    if (profile?.name) setHName((v) => v || profile.name);
    if (profile?.email) setHEmail((v) => v || profile.email);
    const phone = devoteeData?.mobile || profile?.phone;
    if (phone) setHPhone((v) => v || phone);
  }, [profile, devoteeData]);

  // --- floating button placement / drag ------------------------------------

  const getDefaultPos = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLg = w >= 1024;
    return { x: w - 56 - 16, y: h - (isLg ? 32 : 160) - 56 };
  }, []);

  useEffect(() => {
    setBtnPos(getDefaultPos());
    const onResize = () => {
      setBtnPos((prev) => (prev
        ? { x: Math.min(prev.x, window.innerWidth - 56), y: Math.min(prev.y, window.innerHeight - 56) }
        : getDefaultPos()));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getDefaultPos]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const cur = btnPos || getDefaultPos();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: cur.x, startPosY: cur.y, dragged: false };
  }, [btnPos, getDefaultPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.dragged = true;
    if (!dragRef.current.dragged) return;
    setBtnPos({
      x: Math.max(0, Math.min(window.innerWidth - 56, dragRef.current.startPosX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 56, dragRef.current.startPosY + dy)),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    const wasDrag = dragRef.current?.dragged;
    dragRef.current = null;
    if (!wasDrag) setIsOpen(true);
  }, []);

  // --- data ----------------------------------------------------------------

  const mergeLines = useCallback((incoming: ChatLine[]) => {
    if (!incoming.length) return;
    setLines((prev) => {
      const seen = new Set(prev.map((l) => l.id));
      const merged = [...prev, ...incoming.filter((l) => !seen.has(l.id))];
      merged.sort((a, b) => a.id - b.id);
      lastIdRef.current = merged.length ? merged[merged.length - 1].id : 0;
      return merged;
    });
  }, []);

  const authHeaders = useCallback(async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const token = await getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch { /* anonymous visitors are fine */ }
    return headers;
  }, [getToken]);

  /**
   * The visitorId is a bearer secret, so it travels in the POST body — never in
   * a URL that browsers, proxies and access logs would retain.
   */
  const pollChat = useCallback(async (conversationId: number, markRead: boolean) => {
    return fetch("/api/live-chat/poll", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        conversationId,
        visitorId: visitorIdRef.current,
        sinceId: lastIdRef.current,
        markRead,
      }),
    });
  }, [authHeaders]);

  const startSession = useCallback(async (
    requestedMode: "team" | "bot" | "email" = "team",
    extra?: { name?: string; email?: string; phone?: string; concern?: string },
  ) => {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/live-chat/session", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          visitorId: visitorIdRef.current,
          source: "app",
          mode: botOnly ? "bot" : requestedMode,
          ...extra,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error === "email_required" || data?.error === "concern_required"
            ? "Please share a valid email and a short note about your concern."
            : "We could not open the chat just now. Please try again."
        );
        return;
      }
      if (data.needsChoice) {
        setNeedsChoice(true);
        setConversation(null);
        return;
      }
      setNeedsChoice(false);
      setPreEmailMode(false);
      setConversation(data.conversation);
      lastIdRef.current = 0;
      setLines([]);
      mergeLines(data.messages || []);
      setAgentOnline(!!data.agentOnline);
      setUnread(0);
      setSuggestedActions(data.suggestedActions || []);
      if (requestedMode === "email") setHConcern("");
    } catch {
      setError("We could not open the chat just now. Please try again.");
    } finally {
      setStarting(false);
    }
  }, [authHeaders, mergeLines, botOnly]);

  useEffect(() => {
    if (isOpen && !conversation && !starting && !needsChoice) void startSession();
  }, [isOpen, conversation, starting, needsChoice, startSession]);

  // Re-check the team's availability every time the widget is reopened, so a
  // visitor who saw the offline choice earlier gets routed to the team once
  // someone comes back online.
  useEffect(() => {
    if (!isOpen) {
      setNeedsChoice(false);
      setPreEmailMode(false);
    }
  }, [isOpen]);

  const submitPreChatEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hEmail.trim() || !hConcern.trim()) return;
    await startSession("email", { name: hName.trim(), email: hEmail.trim(), phone: hPhone.trim(), concern: hConcern.trim() });
  };

  // Poll while the panel is open; a slower loop below keeps the badge fresh
  // once a conversation exists.
  useEffect(() => {
    if (!isOpen || !conversation) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await pollChat(conversation.id, true);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        mergeLines(data.messages || []);
        setAgentOnline(!!data.agentOnline);
        if (data.conversation) setConversation(data.conversation);
      } catch { /* transient network blips are ignored */ }
    };

    void tick();
    const interval = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOpen, conversation, mergeLines, pollChat]);

  // One quiet check when closed so the badge can appear after an agent replies.
  useEffect(() => {
    if (isOpen || !conversation) return;
    let cancelled = false;
    const check = async () => {
      try {
        // markRead:false — a closed widget has not been read by the devotee.
        const res = await pollChat(conversation.id, false);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const fresh = (data.messages || []).filter((m: ChatLine) => m.author !== "user");
        if (fresh.length) {
          mergeLines(data.messages);
          setUnread((u) => u + fresh.length);
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOpen, conversation, mergeLines, pollChat]);

  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen, lines.length]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, showHandoffForm]);

  const sendMessage = async (text: string) => {
    const body = text.trim();
    if (!body || sending || !conversation) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/live-chat/message", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ visitorId: visitorIdRef.current, conversationId: conversation.id, content: body }),
      });
      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      mergeLines(data.messages || []);
      setAgentOnline(!!data.agentOnline);
      if (data.conversation) setConversation(data.conversation);
      setSuggestedActions(data.suggestedActions || []);
    } catch {
      setError("Message not sent. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  /**
   * Topic chips either send their topic as a message (so the rule-based
   * assistant answers it) or, for `navigate:<path>` actions, take the
   * devotee straight to that section of the app.
   */
  const handleAction = (action: string) => {
    if (action.startsWith("navigate:")) {
      setLocation(action.slice("navigate:".length));
      setIsOpen(false);
      return;
    }
    void sendMessage(action);
  };

  const requestAgent = async () => {
    if (!conversation) return;
    if (!agentOnline) {
      setShowHandoffForm(true);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/live-chat/request-agent", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          visitorId: visitorIdRef.current,
          conversationId: conversation.id,
          name: hName || profile?.name || "",
          email: hEmail || profile?.email || "",
          phone: hPhone || "",
        }),
      });
      if (!res.ok) {
        setShowHandoffForm(true);
        return;
      }
      const data = await res.json();
      if (data.conversation) setConversation(data.conversation);
      lastIdRef.current = Math.max(0, lastIdRef.current);
    } catch {
      setError("Could not reach our team. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const submitHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !hEmail.trim() || !hConcern.trim()) return;
    setHandoffSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/live-chat/request-agent", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          visitorId: visitorIdRef.current,
          conversationId: conversation.id,
          name: hName.trim(),
          email: hEmail.trim(),
          phone: hPhone.trim(),
          concern: hConcern.trim(),
        }),
      });
      if (!res.ok) {
        setError("We could not record your concern. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.conversation) setConversation(data.conversation);
      setShowHandoffForm(false);
      setHConcern("");
    } catch {
      setError("We could not record your concern. Please try again.");
    } finally {
      setHandoffSubmitting(false);
    }
  };

  const restartChat = useCallback(() => {
    setConversation(null);
    setLines([]);
    lastIdRef.current = 0;
    setUnread(0);
    setError("");
    setShowHandoffForm(false);
    setNeedsChoice(false);
    setPreEmailMode(false);
    setSuggestedActions([]);
    void startSession();
  }, [startSession]);

  /**
   * Lets a devotee leave a stuck or already-answered thread (e.g. a stale
   * offline/ticket conversation) and get straight to a fresh chat, instead of
   * always resuming whatever conversation is still open for this visitor.
   */
  const closeCurrentAndStartNew = useCallback(async () => {
    if (!conversation || closingChat) return;
    setClosingChat(true);
    try {
      await fetch("/api/live-chat/close", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ visitorId: visitorIdRef.current, conversationId: conversation.id }),
      });
    } catch {
      // Best-effort — start a new chat locally either way so the devotee is
      // never stuck on the old thread.
    } finally {
      setClosingChat(false);
    }
    restartChat();
  }, [conversation, closingChat, authHeaders, restartChat]);

  const status = conversation?.status ?? "bot";
  const headerTitle = !conversation && needsChoice
    ? "Sringeri Team"
    : status === "live"
    ? conversation?.assignedAgentName || "Sringeri Team"
    : "Sringeri Sahayak";
  const headerSubtitle =
    !conversation && needsChoice ? "Our team is offline right now"
    : status === "live" ? "You are chatting with our team"
    : status === "waiting" ? "Connecting you to our team…"
    : status === "offline_pending" ? "We will reply within 2–4 hours"
    : status === "closed" ? "This chat has been closed"
    : agentOnline ? "AI assistant · team available" : "AI assistant · team offline";

  const canType = status !== "closed" && !!conversation;

  return (
    <>
      {!isOpen && btnPos && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="fixed z-50 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none transition-colors"
          style={{ left: btnPos.x, top: btnPos.y }}
          aria-label="Open live chat"
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-6 w-6 text-white pointer-events-none" />
          {agentOnline && (
            <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white pointer-events-none" />
          )}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center pointer-events-none" data-testid="badge-chat-unread">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-24 lg:bottom-8 right-4 z-50" data-testid="chatbot-widget">
          <Card className="w-[350px] h-[500px] shadow-2xl border-primary/20 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
            <CardHeader className="bg-primary text-primary-foreground p-3 rounded-t-xl shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 bg-white/20 border border-white/40">
                    <AvatarImage src="/assets/lamp-icon.jpg" />
                    <AvatarFallback>
                      {status === "live" || (!conversation && needsChoice) ? <Headset className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm font-serif">{headerTitle}</CardTitle>
                    <p className="text-[10px] opacity-85 flex items-center gap-1">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${agentOnline ? "bg-green-400" : "bg-white/50"}`} />
                      {headerSubtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {conversation && status !== "closed" && !needsChoice && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void closeCurrentAndStartNew()}
                      disabled={closingChat || starting}
                      className="text-white hover:bg-white/20 h-7 w-7"
                      aria-label="Close this chat and start a new one"
                      title="Close this chat and start a new one"
                      data-testid="button-close-and-restart-chat"
                    >
                      {closingChat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 h-7 w-7"
                    data-testid="button-close-chat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden bg-background/50 min-h-0">
              <ScrollArea className="h-full" ref={scrollRef}>
                <div className="p-4 space-y-3">
                  {starting && !needsChoice && (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {!conversation && needsChoice && (
                    <div className="space-y-3 py-2" data-testid="chat-offline-choice">
                      <p className="text-xs text-muted-foreground text-center">
                        Our team is offline right now. Choose how you'd like to continue:
                      </p>
                      {!preEmailMode ? (
                        <div className="space-y-2">
                          <Button
                            type="button"
                            className="w-full justify-center gap-1.5"
                            size="sm"
                            onClick={() => void startSession("bot")}
                            disabled={starting}
                            data-testid="button-choose-bot"
                          >
                            {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Bot className="h-3.5 w-3.5" /> Chat with AI assistant</>}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-center gap-1.5"
                            size="sm"
                            onClick={() => setPreEmailMode(true)}
                            disabled={starting}
                            data-testid="button-choose-email"
                          >
                            <Mail className="h-3.5 w-3.5" /> Email us instead
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={submitPreChatEmail} className="border rounded-xl p-3 space-y-2 bg-white" data-testid="form-prechat-email">
                          <Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Your name" className="h-8 text-sm" data-testid="input-prechat-name" />
                          <Input type="email" value={hEmail} onChange={(e) => setHEmail(e.target.value)} placeholder="Email *" className="h-8 text-sm" required data-testid="input-prechat-email" />
                          <Input value={hPhone} onChange={(e) => setHPhone(e.target.value)} placeholder="Phone (optional)" className="h-8 text-sm" data-testid="input-prechat-phone" />
                          <Textarea value={hConcern} onChange={(e) => setHConcern(e.target.value)} placeholder="Describe your concern *" className="text-sm min-h-[64px] resize-none" required data-testid="input-prechat-concern" />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" className="flex-1" disabled={starting || !hEmail.trim() || !hConcern.trim()} data-testid="button-submit-prechat-email">
                              {starting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</> : "Send to our team"}
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setPreEmailMode(false)} disabled={starting} data-testid="button-cancel-prechat-email">
                              Back
                            </Button>
                          </div>
                        </form>
                      )}
                      {error && (
                        <p className="text-xs text-red-600 text-center" data-testid="text-chat-error">{error}</p>
                      )}
                    </div>
                  )}

                  {!needsChoice && lines.map((line) => {
                    if (line.author === "system") {
                      return (
                        <div key={line.id} className="text-center" data-testid={`chat-message-system-${line.id}`}>
                          <span className="inline-block text-[11px] text-muted-foreground bg-muted/70 rounded-full px-3 py-1">
                            {renderMarkdown(line.content)}
                          </span>
                        </div>
                      );
                    }
                    const mine = line.author === "user";
                    return (
                      <div key={line.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : line.author === "agent"
                              ? "bg-amber-50 border border-amber-200 text-foreground rounded-tl-none"
                              : "bg-muted text-foreground rounded-tl-none"
                          }`}
                          data-testid={`chat-message-${line.author}-${line.id}`}
                        >
                          {line.author === "agent" && (
                            <p className="text-[10px] font-semibold text-amber-700 mb-0.5">
                              {line.authorName || "Sringeri Team"}
                            </p>
                          )}
                          {mine ? line.content : renderMarkdown(line.content)}
                        </div>
                      </div>
                    );
                  })}

                  {!needsChoice && status === "bot" && !sending && !showHandoffForm && suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1 ml-1" data-testid="chat-suggested-actions">
                      {suggestedActions.map((a, j) => (
                        <button
                          key={`${a.action}-${j}`}
                          type="button"
                          onClick={() => handleAction(a.action)}
                          className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50"
                          data-testid={`button-action-${a.action}-${j}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {!needsChoice && sending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-2.5 text-sm flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-muted-foreground text-xs">Typing…</span>
                      </div>
                    </div>
                  )}

                  {!needsChoice && showHandoffForm && (
                    <form onSubmit={submitHandoff} className="border rounded-xl p-3 space-y-2 bg-white" data-testid="form-offline-handoff">
                      <p className="text-xs text-muted-foreground">
                        Our team is offline right now. Leave your concern and we will reply within <strong>2–4 hours</strong>.
                      </p>
                      <Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Your name" className="h-8 text-sm" data-testid="input-handoff-name" />
                      <Input type="email" value={hEmail} onChange={(e) => setHEmail(e.target.value)} placeholder="Email *" className="h-8 text-sm" required data-testid="input-handoff-email" />
                      <Input value={hPhone} onChange={(e) => setHPhone(e.target.value)} placeholder="Phone (optional)" className="h-8 text-sm" data-testid="input-handoff-phone" />
                      <Textarea value={hConcern} onChange={(e) => setHConcern(e.target.value)} placeholder="Describe your concern *" className="text-sm min-h-[64px] resize-none" required data-testid="input-handoff-concern" />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="flex-1" disabled={handoffSubmitting || !hEmail.trim() || !hConcern.trim()} data-testid="button-submit-handoff">
                          {handoffSubmitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</> : "Send to our team"}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowHandoffForm(false)} data-testid="button-cancel-handoff">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {!needsChoice && error && (
                    <p className="text-xs text-red-600 text-center" data-testid="text-chat-error">{error}</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            {(!needsChoice || conversation) && (
            <CardFooter className="p-2.5 border-t bg-background shrink-0 flex-col gap-2 items-stretch">
              {status === "closed" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={restartChat}
                  disabled={starting}
                  className="w-full"
                  data-testid="button-start-new-chat"
                >
                  {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Start a new chat"}
                </Button>
              ) : (
                <>
                  {!botOnly && status !== "live" && status !== "waiting" && !showHandoffForm && (
                    <button
                      onClick={requestAgent}
                      disabled={sending || !conversation}
                      className="text-xs text-primary hover:underline flex items-center justify-center gap-1.5 disabled:opacity-50"
                      data-testid="button-talk-to-person"
                    >
                      <Headset className="h-3.5 w-3.5" />
                      Talk to a person
                      {!agentOnline && <span className="text-muted-foreground">· team offline</span>}
                    </button>
                  )}

                  {status === "offline_pending" && (
                    <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                      <Mail className="h-3 w-3" /> We will reply to {conversation?.email} within 2–4 hours.
                    </p>
                  )}

                  <form
                    className="flex w-full gap-2"
                    onSubmit={(e) => { e.preventDefault(); void sendMessage(input); }}
                  >
                    <Input
                      placeholder="Type your message…"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="flex-1"
                      disabled={!canType || sending}
                      data-testid="input-chat-message"
                    />
                    <Button type="submit" size="icon" disabled={!input.trim() || !canType || sending} data-testid="button-send-chat">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              )}
            </CardFooter>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
