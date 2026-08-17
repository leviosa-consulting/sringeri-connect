import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ImagePlus, Loader2, MessageSquarePlus, Send, X, Headset, Bot, Mail, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import ChatbotWidget from "@/components/chatbot-widget";

/**
 * The dedicated conversation screen: every request the devotee has raised,
 * listed by its subject line, opening into a full thread. When the team is
 * online a new conversation reaches them directly; when it is not, the same
 * conversation is registered as a ticket and answered by email.
 */

type ChatStatus = "bot" | "waiting" | "live" | "offline_pending" | "closed";

interface ChatLine {
  id: number;
  author: "user" | "bot" | "agent" | "system";
  authorName: string | null;
  content: string;
  attachmentMime?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
}

interface ConversationSummary {
  id: number;
  subject: string | null;
  status: ChatStatus;
  source: string;
  unreadForVisitor: number;
  lastMessageAt: string;
  assignedAgentName: string | null;
  preview: string;
  previewAuthor: string | null;
}

interface Conversation {
  id: number;
  subject: string | null;
  status: ChatStatus;
  name: string | null;
  email: string | null;
  phone: string | null;
  assignedAgentName: string | null;
}

const VISITOR_KEY = "sringeri_chat_visitor_id";
const POLL_MS = 4000;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID?.() || `v${Date.now()}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `v${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
}

function statusLabel(status: ChatStatus, agentName?: string | null) {
  switch (status) {
    case "live": return agentName ? `With ${agentName}` : "With our team";
    case "waiting": return "Waiting for our team";
    case "offline_pending": return "Awaiting reply";
    case "closed": return "Closed";
    default: return "Assistant";
  }
}

function statusTone(status: ChatStatus) {
  switch (status) {
    case "live": return "bg-green-100 text-green-800 border-green-200";
    case "waiting": return "bg-amber-100 text-amber-800 border-amber-200";
    case "offline_pending": return "bg-blue-100 text-blue-800 border-blue-200";
    case "closed": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function timeLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function ChatPage() {
  const { user, profile, devoteeData, getToken } = useAuth();
  const [, navigate] = useLocation();

  const [visitorReady, setVisitorReady] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [agentOnline, setAgentOnline] = useState(false);
  const [openConvo, setOpenConvo] = useState<Conversation | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [composing, setComposing] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // New-conversation form
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [starting, setStarting] = useState(false);

  const visitorIdRef = useRef<string>("");
  const lastIdRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.name) setGName(v => v || profile.name);
    if (profile?.email) setGEmail(v => v || profile.email);
    const phone = devoteeData?.mobile || profile?.phone;
    if (phone) setGPhone(v => v || phone);
  }, [profile, devoteeData]);

  const authHeaders = useCallback(async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const token = await getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch { /* guests are welcome */ }
    return headers;
  }, [getToken]);

  // A visitor arriving from the website widget carries a one-shot hand-off
  // ticket so their existing thread follows them here instead of starting over.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The widget passes the hand-off ticket in the fragment, which browsers
      // keep out of request logs, proxies and Referer headers.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const handoff = hash.get("handoff");
      if (handoff) {
        try {
          const res = await fetch("/api/live-chat/handoff/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: handoff }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.visitorId) {
            try { localStorage.setItem(VISITOR_KEY, data.visitorId); } catch { /* private mode */ }
          }
        } catch { /* fall back to this device's own identity */ }
        hash.delete("handoff");
        const rest = hash.toString();
        window.history.replaceState({}, "", window.location.pathname + window.location.search + (rest ? `#${rest}` : ""));
      }
      if (cancelled) return;
      visitorIdRef.current = getVisitorId();
      setVisitorReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadList = useCallback(async () => {
    if (!visitorIdRef.current) return;
    try {
      const res = await fetch("/api/live-chat/conversations", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ visitorId: visitorIdRef.current }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
      setAgentOnline(!!data.agentOnline);
    } catch { /* transient blips are ignored */ } finally {
      setListLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!visitorReady) return;
    void loadList();
  }, [visitorReady, loadList]);

  // Poll the list while browsing, and the open thread while reading it.
  useEffect(() => {
    if (!visitorReady) return;
    const timer = setInterval(() => {
      if (openConvo) void pollThread(openConvo.id);
      else void loadList();
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorReady, openConvo, loadList]);

  const mergeLines = useCallback((incoming: ChatLine[]) => {
    if (!incoming?.length) return;
    setLines(prev => {
      const seen = new Set(prev.map(l => l.id));
      const merged = prev.concat(incoming.filter(l => !seen.has(l.id))).sort((a, b) => a.id - b.id);
      lastIdRef.current = merged.length ? merged[merged.length - 1].id : 0;
      return merged;
    });
  }, []);

  const pollThread = useCallback(async (conversationId: number) => {
    try {
      const res = await fetch("/api/live-chat/poll", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          visitorId: visitorIdRef.current,
          conversationId,
          sinceId: lastIdRef.current,
          markRead: true,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversation) setOpenConvo(data.conversation);
      setAgentOnline(!!data.agentOnline);
      mergeLines(data.messages || []);
    } catch { /* transient blips are ignored */ }
  }, [authHeaders, mergeLines]);

  const openConversation = useCallback(async (id: number) => {
    setError("");
    setNotice("");
    setLines([]);
    lastIdRef.current = 0;
    try {
      const res = await fetch("/api/live-chat/conversation", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ visitorId: visitorIdRef.current, conversationId: id }),
      });
      if (!res.ok) {
        setError("We could not open that conversation.");
        return;
      }
      const data = await res.json();
      setOpenConvo(data.conversation);
      mergeLines(data.messages || []);
      setAgentOnline(!!data.agentOnline);
      setConversations(prev => prev.map(c => (c.id === id ? { ...c, unreadForVisitor: 0 } : c)));
    } catch {
      setError("We could not open that conversation.");
    }
  }, [authHeaders, mergeLines]);

  // A `?c=<id>` link (from a reply notification, say) opens that thread directly.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (!visitorReady || deepLinkedRef.current) return;
    const id = parseInt(new URLSearchParams(window.location.search).get("c") || "", 10);
    deepLinkedRef.current = true;
    if (Number.isFinite(id)) void openConversation(id);
  }, [visitorReady, openConversation]);

  useEffect(() => {
    // `nearest` keeps the scroll inside the transcript instead of dragging the
    // whole page down past the header.
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines.length, openConvo?.id]);

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || starting) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/live-chat/start", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          visitorId: visitorIdRef.current,
          source: "app",
          pagePath: "/chat",
          pageTitle: document.title,
          subject: subject.trim(),
          message: firstMessage.trim(),
          name: gName.trim(),
          email: gEmail.trim(),
          phone: gPhone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error === "email_required"
            ? "Please share an email address so our team can reply."
            : data?.error === "subject_required"
            ? "Please add a subject for your conversation."
            : "We could not start the conversation. Please try again.",
        );
        return;
      }
      setLines([]);
      lastIdRef.current = 0;
      setOpenConvo(data.conversation);
      mergeLines(data.messages || []);
      setAgentOnline(!!data.agentOnline);
      setComposing(false);
      setSubject("");
      setFirstMessage("");
      void loadList();
    } catch {
      setError("We could not start the conversation. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async (text: string) => {
    const body = text.trim();
    if (!body || sending || !openConvo) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/live-chat/message", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ visitorId: visitorIdRef.current, conversationId: openConvo.id, content: body }),
      });
      if (!res.ok) {
        setError("Message not sent. Please check your connection.");
        return;
      }
      const data = await res.json();
      setInput("");
      if (data.conversation) setOpenConvo(data.conversation);
      mergeLines(data.messages || []);
    } catch {
      setError("Message not sent. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  const attachImage = async (file: File) => {
    if (!openConvo) return;
    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("That image is larger than 2MB. Please choose a smaller one.");
      return;
    }
    setUploading(true);
    try {
      const dataBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/live-chat/attachment", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          visitorId: visitorIdRef.current,
          conversationId: openConvo.id,
          dataBase64,
          fileName: file.name,
          caption: input.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error === "too_large" ? "That image is larger than 2MB."
          : data?.error === "unsupported_type" ? "Only JPG, PNG and WEBP images can be attached."
          : "We could not attach that image. Please try again.",
        );
        return;
      }
      setInput("");
      if (data.conversation) setOpenConvo(data.conversation);
      mergeLines(data.messages || []);
    } catch {
      setError("We could not attach that image. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const backToList = () => {
    setOpenConvo(null);
    setLines([]);
    lastIdRef.current = 0;
    setError("");
    void loadList();
  };

  // --- list -----------------------------------------------------------------

  const renderList = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-serif font-semibold">Your conversations</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${agentOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
            {agentOnline ? "Our team is online now" : "Our team is offline — we reply within 2–4 hours"}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setComposing(true); setError(""); }} data-testid="button-new-conversation">
          <MessageSquarePlus className="h-4 w-4" /> New
        </Button>
      </div>

      {listLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : conversations.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Headset className="h-8 w-8 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm text-muted-foreground">Start one with a subject and our team will pick it up.</p>
          </div>
          <Button onClick={() => setComposing(true)} className="gap-1.5" data-testid="button-first-conversation">
            <MessageSquarePlus className="h-4 w-4" /> Start a conversation
          </Button>
        </Card>
      ) : (
        <div className="divide-y rounded-xl border bg-card overflow-hidden">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => void openConversation(c.id)}
              className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex gap-3 items-start"
              data-testid={`row-conversation-${c.id}`}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {c.status === "bot" ? <Bot className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{c.subject || "Chat with the assistant"}</p>
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{timeLabel(c.lastMessageAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {c.previewAuthor === "user" && <CheckCheck className="h-3 w-3 inline mr-1 opacity-60" />}
                    {c.preview || "No messages yet"}
                  </p>
                  {c.unreadForVisitor > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                      {c.unreadForVisitor > 9 ? "9+" : c.unreadForVisitor}
                    </span>
                  )}
                </div>
                <Badge variant="outline" className={`mt-1 text-[10px] font-normal ${statusTone(c.status)}`}>
                  {statusLabel(c.status, c.assignedAgentName)}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // --- new conversation -----------------------------------------------------

  const renderComposer = () => (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setComposing(false)} data-testid="button-cancel-new">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-serif font-semibold">Start a conversation</h2>
          <p className="text-xs text-muted-foreground">
            {agentOnline ? "Our team is online and will join you." : "Our team is offline — this becomes a ticket and we reply within 2–4 hours."}
          </p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={startConversation}>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="What is this about?"
            maxLength={140}
            required
            data-testid="input-subject"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Message (optional)</label>
          <Textarea
            value={firstMessage}
            onChange={e => setFirstMessage(e.target.value)}
            rows={3}
            placeholder="Add any detail that would help us"
            maxLength={2000}
            data-testid="input-first-message"
          />
        </div>

        {!user && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={gName} onChange={e => setGName(e.target.value)} placeholder="Your name" data-testid="input-guest-name" />
            <Input value={gEmail} onChange={e => setGEmail(e.target.value)} type="email" required placeholder="Email address" data-testid="input-guest-email" />
            <Input value={gPhone} onChange={e => setGPhone(e.target.value)} placeholder="Phone (optional)" data-testid="input-guest-phone" />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={starting || !subject.trim()} className="gap-1.5" data-testid="button-start-conversation">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {agentOnline ? "Start chat" : "Raise a ticket"}
        </Button>
      </form>
    </Card>
  );

  // --- thread ---------------------------------------------------------------

  const renderThread = (convo: Conversation) => {
    const canType = convo.status !== "closed";
    return (
      <Card className="flex flex-col h-[calc(100vh-13rem)] min-h-[420px] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-primary text-primary-foreground shrink-0">
          <Button variant="ghost" size="icon" onClick={backToList} className="text-primary-foreground hover:bg-white/20 h-8 w-8" data-testid="button-back-to-list">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-medium truncate text-sm">{convo.subject || "Chat with the assistant"}</p>
            <p className="text-[11px] opacity-85">{statusLabel(convo.status, convo.assignedAgentName)}</p>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 bg-background/50">
          <div className="p-4 space-y-3">
            {lines.map(line => {
              if (line.author === "system") {
                return (
                  <div key={line.id} className="text-center">
                    <span className="inline-block text-[11px] text-muted-foreground bg-muted rounded-full px-3 py-1">{line.content}</span>
                  </div>
                );
              }
              const mine = line.author === "user";
              return (
                <div key={line.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}>
                    {!mine && (
                      <p className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">
                        {line.author === "agent" ? line.authorName || "Sringeri Team" : "Sringeri Sahayak"}
                      </p>
                    )}
                    {line.attachmentUrl && (
                      <button type="button" onClick={() => setPreview(line.attachmentUrl!)} className="block mb-1">
                        <img
                          src={line.attachmentUrl}
                          alt={line.content || "Attachment"}
                          className="rounded-lg max-h-56 max-w-full object-contain bg-black/5"
                          data-testid={`img-attachment-${line.id}`}
                        />
                      </button>
                    )}
                    {line.content && <p className="whitespace-pre-wrap break-words">{line.content}</p>}
                    <p className={`text-[10px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>{timeLabel(line.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-2.5 space-y-2 bg-card shrink-0">
          {convo.status === "offline_pending" && (
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <Mail className="h-3 w-3" /> We will reply{convo.email ? ` to ${convo.email}` : ""} within 2–4 hours.
            </p>
          )}
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          {notice && <p className="text-xs text-muted-foreground text-center">{notice}</p>}
          {canType ? (
            <form
              className="flex items-center gap-2"
              onSubmit={e => { e.preventDefault(); void sendMessage(input); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void attachImage(f); }}
                data-testid="input-attachment"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Attach an image (max 2MB)"
                data-testid="button-attach"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </Button>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message…"
                disabled={sending}
                data-testid="input-message"
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()} data-testid="button-send">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          ) : (
            <Button variant="outline" className="w-full gap-1.5" onClick={() => { backToList(); setComposing(true); }} data-testid="button-start-another">
              <MessageSquarePlus className="h-4 w-4" /> Start a new conversation
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-5 pb-24">
      {!visitorReady ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : openConvo ? (
        renderThread(openConvo)
      ) : composing ? (
        renderComposer()
      ) : (
        renderList()
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
          data-testid="overlay-image-preview"
        >
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
          <img src={preview} alt="Attachment" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}

      {/* Quick answers stay one tap away, without taking over the screen. */}
      <ChatbotWidget botOnly />
    </div>
  );
}
