import { useState, useEffect, useRef, useCallback } from "react";
import { Headset, Send, Loader2, X, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Live Chat console for the support team: a manual online/offline toggle plus
 * the queue of devotee conversations with transcript, reply and close.
 */

type ChatStatus = "bot" | "waiting" | "live" | "offline_pending" | "closed";

interface Conversation {
  id: number;
  visitorId: string;
  odUserId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: ChatStatus;
  source: string;
  assignedAgentName: string | null;
  unreadForAgent: number;
  lastMessageAt: string;
  createdAt: string;
}

interface ChatLine {
  id: number;
  author: "user" | "bot" | "agent" | "system";
  authorName: string | null;
  content: string;
  createdAt: string;
}

const POLL_MS = 5000;

const STATUS_STYLES: Record<ChatStatus, { label: string; className: string }> = {
  waiting: { label: "Waiting", className: "bg-red-100 text-red-700" },
  live: { label: "Live", className: "bg-green-100 text-green-700" },
  offline_pending: { label: "Offline concern", className: "bg-amber-100 text-amber-700" },
  bot: { label: "With bot", className: "bg-slate-100 text-slate-600" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function LiveChatConsole({ token }: { token: string }) {
  const { toast } = useToast();
  const [presence, setPresence] = useState<{ online: boolean; agentName: string | null }>({ online: false, agentName: null });
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [reply, setReply] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [alsoEmail, setAlsoEmail] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const authFetch = useCallback(
    (url: string, init: RequestInit = {}) =>
      fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
      }),
    [token],
  );

  const loadPresence = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/live-chat/presence");
      if (res.ok) setPresence(await res.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/live-chat/conversations");
      if (res.ok) setConversations(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [authFetch]);

  // Guards against a slow request for conversation A landing after the agent
  // has already switched to conversation B.
  const transcriptReqRef = useRef(0);

  const loadTranscript = useCallback(async (id: number) => {
    const seq = ++transcriptReqRef.current;
    try {
      const res = await authFetch(`/api/admin/live-chat/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (seq === transcriptReqRef.current) setLines(data.messages || []);
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => {
    if (!token) return;
    void loadPresence();
    void loadConversations();
  }, [token, loadPresence, loadConversations]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      void loadConversations();
      if (selectedId) void loadTranscript(selectedId);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [token, selectedId, loadConversations, loadTranscript]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [lines]);

  const togglePresence = async (online: boolean) => {
    setPresenceSaving(true);
    try {
      const res = await authFetch("/api/admin/live-chat/presence", {
        method: "POST",
        body: JSON.stringify({ online }),
      });
      if (!res.ok) throw new Error();
      setPresence(await res.json());
      toast({ title: online ? "You are online" : "You are offline", description: online ? "Devotees can now reach you on Live Chat." : "New concerns will be captured by email." });
    } catch {
      toast({ title: "Could not change your status", variant: "destructive" });
    } finally {
      setPresenceSaving(false);
    }
  };

  const openConversation = async (id: number) => {
    setSelectedId(id);
    setLines([]);
    setReply("");
    await loadTranscript(id);
    void loadConversations();
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setReplySending(true);
    try {
      const res = await authFetch(`/api/admin/live-chat/conversations/${selectedId}/reply`, {
        method: "POST",
        body: JSON.stringify({ content: reply.trim(), sendEmail: alsoEmail }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReply("");
      await loadTranscript(selectedId);
      void loadConversations();
      if (alsoEmail && !data.emailed) {
        toast({ title: "Reply sent in chat", description: "The email copy could not be sent." });
      }
    } catch {
      toast({ title: "Could not send the reply", variant: "destructive" });
    } finally {
      setReplySending(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    try {
      const res = await authFetch(`/api/admin/live-chat/conversations/${selectedId}/close`, { method: "POST" });
      if (!res.ok) throw new Error();
      await loadTranscript(selectedId);
      void loadConversations();
      toast({ title: "Conversation closed" });
    } catch {
      toast({ title: "Could not close the conversation", variant: "destructive" });
    }
  };

  const selected = conversations.find((c) => c.id === selectedId) || null;
  const waiting = conversations.filter((c) => c.status === "waiting").length;
  const pending = conversations.filter((c) => c.status === "offline_pending").length;

  return (
    <div className="space-y-4" data-testid="live-chat-console">
      <div className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <Headset className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-[180px]">
          <p className="font-semibold text-sm">Live Chat</p>
          <p className="text-xs text-muted-foreground">
            {presence.online
              ? "You are online — devotees can reach you directly."
              : "You are offline — concerns are captured by email with a 2–4 hour promise."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {waiting > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700" data-testid="chip-waiting">
              {waiting} waiting
            </span>
          )}
          {pending > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700" data-testid="chip-offline-pending">
              {pending} offline
            </span>
          )}
          <Button
            size="sm"
            variant={presence.online ? "default" : "outline"}
            onClick={() => togglePresence(!presence.online)}
            disabled={presenceSaving}
            data-testid="button-toggle-presence"
          >
            {presenceSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : presence.online ? "Go offline" : "Go online"}
          </Button>
          <button
            onClick={() => { void loadConversations(); void loadPresence(); }}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            title="Refresh"
            data-testid="button-refresh-chats"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <div className="bg-white border border-border rounded-xl overflow-hidden max-h-[420px] overflow-y-auto" data-testid="list-conversations">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No chats yet.</p>
          ) : (
            conversations.map((c) => {
              const style = STATUS_STYLES[c.status] || STATUS_STYLES.bot;
              return (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-muted/40 transition-colors ${selectedId === c.id ? "bg-muted/60" : ""}`}
                  data-testid={`button-conversation-${c.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${style.className}`}>{style.label}</span>
                    {c.unreadForAgent > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">{c.unreadForAgent}</span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">{formatTime(c.lastMessageAt)}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{c.name || "Devotee"} <span className="text-xs font-normal text-muted-foreground">#{c.id}</span></p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.email || "no email yet"}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="bg-white border border-border rounded-xl flex flex-col min-h-[320px]" data-testid="panel-transcript">
          {!selected ? (
            <p className="text-sm text-muted-foreground text-center my-auto py-10">Select a conversation to read and reply.</p>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selected.name || "Devotee"} · #{selected.id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selected.email || "no email"}{selected.phone ? ` · ${selected.phone}` : ""} · via {selected.source}
                  </p>
                </div>
                {selected.status !== "closed" && (
                  <Button size="sm" variant="ghost" onClick={closeConversation} data-testid="button-close-conversation">
                    <X className="h-3.5 w-3.5 mr-1" /> Close
                  </Button>
                )}
              </div>

              <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[300px]">
                {lines.map((line) => {
                  if (line.author === "system") {
                    return (
                      <p key={line.id} className="text-center text-[11px] text-muted-foreground" data-testid={`transcript-system-${line.id}`}>
                        {line.content}
                      </p>
                    );
                  }
                  const fromDevotee = line.author === "user";
                  return (
                    <div key={line.id} className={`flex ${fromDevotee ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                          fromDevotee
                            ? "bg-muted text-foreground rounded-tl-none"
                            : line.author === "bot"
                            ? "bg-slate-100 text-slate-700 rounded-tr-none"
                            : "bg-primary text-primary-foreground rounded-tr-none"
                        }`}
                        data-testid={`transcript-${line.author}-${line.id}`}
                      >
                        {line.author === "bot" && <p className="text-[10px] font-semibold mb-0.5 opacity-70">Sahayak (bot)</p>}
                        {line.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selected.status !== "closed" && (
                <div className="border-t border-border p-3 space-y-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    placeholder="Type your reply to the devotee…"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="textarea-chat-reply"
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alsoEmail}
                        onChange={(e) => setAlsoEmail(e.target.checked)}
                        disabled={!selected.email}
                        data-testid="checkbox-also-email"
                      />
                      <Mail className="h-3 w-3" /> Also email {selected.email ? "" : "(no address)"}
                    </label>
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={sendReply}
                      disabled={!reply.trim() || replySending}
                      data-testid="button-send-chat-reply"
                    >
                      {replySending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <><Send className="h-3.5 w-3.5 mr-1" /> Send</>}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
