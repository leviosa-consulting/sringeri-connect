import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Headset, Send, Loader2, X, Mail, RefreshCw, Search,
  MessageSquare, UserCheck, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { RangoliLoader } from "@/components/rangoli-loader";
import EmbedSettingsPanel from "@/components/embed-settings-panel";

/**
 * Full-page helpdesk for the support team: the whole queue of devotee chats and
 * tickets on the left, the selected thread on the right. This is the one place
 * chats are worked from — the Support page links here.
 */

type ChatStatus = "bot" | "waiting" | "live" | "offline_pending" | "closed";

interface Conversation {
  id: number;
  visitorId: string;
  odUserId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  status: ChatStatus;
  source: string;
  pageUrl: string | null;
  pageTitle: string | null;
  assignedAgentUid: string | null;
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
  attachmentMime?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

const POLL_MS = 5000;

const STATUS_STYLES: Record<ChatStatus, { label: string; className: string }> = {
  waiting: { label: "Waiting", className: "bg-red-100 text-red-700" },
  live: { label: "Live", className: "bg-green-100 text-green-700" },
  offline_pending: { label: "Ticket", className: "bg-amber-100 text-amber-700" },
  bot: { label: "With bot", className: "bg-slate-100 text-slate-600" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

const STATUS_FILTERS: { value: "" | ChatStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "live", label: "Live" },
  { value: "waiting", label: "Waiting" },
  { value: "offline_pending", label: "Tickets" },
  { value: "bot", label: "With bot" },
  { value: "closed", label: "Closed" },
];

const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  app: { label: "App", className: "bg-indigo-100 text-indigo-700" },
  website: { label: "Website", className: "bg-teal-100 text-teal-700" },
};

function sourceStyle(source: string) {
  return SOURCE_STYLES[source] || { label: source, className: "bg-slate-100 text-slate-600" };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Conversations raised before subjects existed still need a readable title. */
function titleOf(c: Conversation) {
  return c.subject?.trim() || `Chat with ${c.name || "a devotee"}`;
}

export default function AdminLiveChat() {
  const { user, loading: authLoading, hasAdminRole, profile } = useAuth();
  const isAdmin = hasAdminRole("support");
  const { toast } = useToast();

  const [token, setToken] = useState("");
  const [presence, setPresence] = useState<{ online: boolean; agentName: string | null }>({ online: false, agentName: null });
  const [presenceSaving, setPresenceSaving] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [reply, setReply] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | ChatStatus>("");
  const [sourceFilter, setSourceFilter] = useState<"" | "app" | "website">("");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) (user as any).getIdToken().then((t: string) => setToken(t));
  }, [user]);

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
    } catch { /* transient network blips are ignored */ }
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
        if (seq !== transcriptReqRef.current) return;
        const next: ChatLine[] = data.messages || [];
        // Replacing the array on every poll would yank the agent back to the
        // bottom mid-read, so only update when the thread really changed.
        setLines((prev) =>
          prev.length === next.length && prev[prev.length - 1]?.id === next[next.length - 1]?.id
            ? prev
            : next,
        );
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
      void loadPresence();
      if (selectedId) void loadTranscript(selectedId);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [token, selectedId, loadConversations, loadPresence, loadTranscript]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    // Jump to the newest line when the thread opens, and afterwards only if the
    // agent is already at the bottom — never while they scroll back through it.
    if (openedAtRef.current !== selectedId || nearBottom) {
      el.scrollTop = el.scrollHeight;
      openedAtRef.current = selectedId;
    }
  }, [lines, selectedId]);

  const togglePresence = async (online: boolean) => {
    setPresenceSaving(true);
    try {
      const res = await authFetch("/api/admin/live-chat/presence", {
        method: "POST",
        body: JSON.stringify({ online }),
      });
      if (!res.ok) throw new Error();
      setPresence(await res.json());
      toast({
        title: online ? "You are online" : "You are offline",
        description: online ? "Devotees can now reach you on Live Chat." : "New concerns are registered as tickets.",
      });
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

  const sendReply = async (takeOver = false) => {
    if (!selectedId || !reply.trim()) return;
    setReplySending(true);
    try {
      const res = await authFetch(`/api/admin/live-chat/conversations/${selectedId}/reply`, {
        method: "POST",
        body: JSON.stringify({ content: reply.trim(), sendEmail: alsoEmail, takeOver }),
      });
      // Somebody else is already working this thread — ask before answering too.
      if (res.status === 409) {
        const info = await res.json().catch(() => ({}));
        const ok = window.confirm(
          `${info.assignedAgentName || "Another agent"} is handling this conversation. Send your reply anyway?`,
        );
        setReplySending(false);
        if (ok) await sendReply(true);
        return;
      }
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

  const assignToMe = async (takeOver = false) => {
    if (!selectedId) return;
    setAssigning(true);
    try {
      const res = await authFetch(`/api/admin/live-chat/conversations/${selectedId}/assign`, {
        method: "POST",
        body: JSON.stringify({ agentName: profile?.name || "", takeOver }),
      });
      if (res.status === 409) {
        const info = await res.json().catch(() => ({}));
        const ok = window.confirm(
          `${info.assignedAgentName || "Another agent"} is handling this conversation. Take it over?`,
        );
        setAssigning(false);
        if (ok) await assignToMe(true);
        return;
      }
      if (!res.ok) throw new Error();
      await loadConversations();
      toast({ title: "Assigned to you" });
    } catch {
      toast({ title: "Could not assign this conversation", variant: "destructive" });
    } finally {
      setAssigning(false);
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
  const tickets = conversations.filter((c) => c.status === "offline_pending").length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (sourceFilter && c.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        titleOf(c).toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        String(c.id) === q
      );
    });
  }, [conversations, statusFilter, sourceFilter, search]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><RangoliLoader size={64} /></div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">This page is only for authorized administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-4 max-w-7xl mx-auto" data-testid="admin-live-chat-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Live Chat &amp; Tickets</h1>
          <p className="text-sm text-muted-foreground truncate">Work the devotee queue from one place</p>
        </div>
        <button
          onClick={() => { void loadConversations(); void loadPresence(); }}
          className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          title="Refresh"
          data-testid="button-refresh-chats"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="bg-white border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <Headset className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold text-sm">{presence.online ? "You are online" : "You are offline"}</p>
          <p className="text-xs text-muted-foreground">
            {presence.online
              ? "Devotees can reach the team directly."
              : "New concerns are registered as tickets with a 2–4 hour reply promise."}
          </p>
        </div>
        {waiting > 0 && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700" data-testid="chip-waiting">
            {waiting} waiting
          </span>
        )}
        {tickets > 0 && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700" data-testid="chip-tickets">
            {tickets} tickets
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
      </div>

      <EmbedSettingsPanel authFetch={authFetch} />

      <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* Queue */}
        <div className="bg-white border border-border rounded-xl overflow-hidden" data-testid="list-conversations">
          <div className="p-3 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, name or email…"
                className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                data-testid="input-search-conversations"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="filter-status">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value || "all"}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    statusFilter === f.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  }`}
                  data-testid={`button-filter-status-${f.value || "all"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="filter-source">
              {([["", "All sources"], ["app", "App"], ["website", "Website"]] as const).map(([value, label]) => (
                <button
                  key={value || "all"}
                  onClick={() => setSourceFilter(value as "" | "app" | "website")}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    sourceFilter === value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  }`}
                  data-testid={`button-filter-source-${value || "all"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : visible.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">No conversations match these filters.</p>
            ) : (
              visible.map((c) => {
                const style = STATUS_STYLES[c.status] || STATUS_STYLES.bot;
                // Tickets awaiting a reply get their own tint so they never look
                // like a live chat somebody is already handling.
                const ticket = c.status === "offline_pending";
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border/60 transition-colors ${
                      selectedId === c.id ? "bg-muted/70" : ticket ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-muted/40"
                    }`}
                    data-testid={`button-conversation-${c.id}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${style.className}`}>{style.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${sourceStyle(c.source).className}`}>
                        {sourceStyle(c.source).label}
                      </span>
                      {c.unreadForAgent > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white" data-testid={`badge-unread-${c.id}`}>
                          {c.unreadForAgent}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">{formatTime(c.lastMessageAt)}</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{titleOf(c)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.name || "Devotee"} · {c.email || "no email yet"} · #{c.id}
                    </p>
                    {c.assignedAgentName && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">With {c.assignedAgentName}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="bg-white border border-border rounded-xl flex flex-col min-h-[60vh]" data-testid="panel-transcript">
          {!selected ? (
            <div className="text-center my-auto py-16 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a conversation to read and reply.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-base truncate" data-testid="text-conversation-subject">{titleOf(selected)}</h2>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${(STATUS_STYLES[selected.status] || STATUS_STYLES.bot).className}`}>
                      {(STATUS_STYLES[selected.status] || STATUS_STYLES.bot).label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {selected.name || "Devotee"} · {selected.email || "no email"}
                    {selected.phone ? ` · ${selected.phone}` : ""} · via {selected.source} · #{selected.id}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selected.assignedAgentName ? `Assigned to ${selected.assignedAgentName}` : "Not assigned yet"}
                    {" · started "}{formatTime(selected.createdAt)}
                  </p>
                  {selected.pageUrl && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={selected.pageTitle || selected.pageUrl}>
                      <span className="font-medium text-foreground/70">Page:</span>{" "}
                      {selected.pageTitle ? `${selected.pageTitle} (${selected.pageUrl})` : selected.pageUrl}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => assignToMe()} disabled={assigning} data-testid="button-assign-to-me">
                    {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><UserCheck className="h-3.5 w-3.5 mr-1" /> Assign to me</>}
                  </Button>
                  {selected.status !== "closed" && (
                    <Button size="sm" variant="ghost" onClick={closeConversation} data-testid="button-close-conversation">
                      <X className="h-3.5 w-3.5 mr-1" /> Close
                    </Button>
                  )}
                </div>
              </div>

              <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[55vh]">
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
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                          fromDevotee
                            ? "bg-muted text-foreground rounded-tl-none"
                            : line.author === "bot"
                            ? "bg-slate-100 text-slate-700 rounded-tr-none"
                            : "bg-primary text-primary-foreground rounded-tr-none"
                        }`}
                        data-testid={`transcript-${line.author}-${line.id}`}
                      >
                        {line.author === "bot" && <p className="text-[10px] font-semibold mb-0.5 opacity-70">Sahayak (bot)</p>}
                        {line.author === "agent" && line.authorName && (
                          <p className="text-[10px] font-semibold mb-0.5 opacity-80">{line.authorName}</p>
                        )}
                        {line.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightbox(line.attachmentUrl!)}
                            className="block mb-1"
                            data-testid={`button-attachment-${line.id}`}
                          >
                            <img
                              src={line.attachmentUrl}
                              alt={line.attachmentName || line.content || "Attachment"}
                              className="rounded-lg max-h-56 max-w-full object-contain bg-black/5"
                              data-testid={`transcript-attachment-${line.id}`}
                            />
                          </button>
                        ) : line.attachmentMime ? (
                          <p className="flex items-center gap-1 text-xs opacity-70 mb-1">
                            <ImageIcon className="h-3 w-3" /> Photo unavailable
                          </p>
                        ) : null}
                        {line.content}
                        <p className="text-[10px] opacity-60 mt-0.5">{formatTime(line.createdAt)}</p>
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
                    rows={3}
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
                      onClick={() => sendReply()}
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

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          data-testid="overlay-attachment"
        >
          <img src={lightbox} alt="Attachment" className="max-h-full max-w-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
