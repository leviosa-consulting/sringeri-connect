import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { RangoliLoader } from "@/components/rangoli-loader";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, ChevronDown, ChevronUp, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LiveChatConsole from "@/components/live-chat-console";


type SupportMessage = {
  id: number;
  type: string;
  odUserId: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  adminReply: string | null;
  status: string;
  createdAt: string;
  repliedAt: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "replied") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <Check className="h-3 w-3" /> Replied
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      Open
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "feedback") {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Feedback</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Support</span>;
}

function MessageRow({ msg, token }: { msg: SupportMessage; token: string }) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState(msg.adminReply || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const replyMutation = useMutation({
    mutationFn: async (reply: string) => {
      const res = await fetch(`/api/support-messages/${msg.id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-messages"] });
      toast({ title: "Reply sent", description: "The reply has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save the reply.", variant: "destructive" });
    },
  });

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden" data-testid={`card-support-${msg.id}`}>
      <button
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
        data-testid={`button-expand-${msg.id}`}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={msg.type} />
            <StatusBadge status={msg.status} />
            <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
          </div>
          <p className="font-medium text-sm text-foreground truncate">{msg.subject}</p>
          <p className="text-xs text-muted-foreground">
            {msg.name}
            {msg.email && <> · {msg.email}</>}
            {msg.phone && <> · {msg.phone}</>}
          </p>
        </div>
        <div className="shrink-0 mt-1 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Message</p>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.message}</p>
          </div>

          {msg.adminReply && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">
                Admin Reply {msg.repliedAt && <span className="font-normal">· {formatDate(msg.repliedAt)}</span>}
              </p>
              <p className="text-sm text-green-900 whitespace-pre-wrap">{msg.adminReply}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {msg.adminReply ? "Update Reply" : "Reply"}
            </p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              placeholder="Type your reply here..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid={`textarea-reply-${msg.id}`}
            />
            <Button
              size="sm"
              onClick={() => replyMutation.mutate(replyText.trim())}
              disabled={!replyText.trim() || replyMutation.isPending}
              data-testid={`button-send-reply-${msg.id}`}
            >
              {replyMutation.isPending ? (
                <span className="flex items-center gap-1"><span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</span>
              ) : (
                <span className="flex items-center gap-1"><Send className="h-3 w-3" /> {msg.adminReply ? "Update" : "Send Reply"}</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSupport() {
  const { user, loading: authLoading, hasAdminRole } = useAuth();
  const isAdmin = hasAdminRole("support");
  const [typeFilter, setTypeFilter] = useState<"" | "support" | "feedback">("");
  const [statusFilter, setStatusFilter] = useState<"" | "open" | "replied">("");
  const [search, setSearch] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (user) {
      (user as any).getIdToken().then((t: string) => setToken(t));
    }
  }, [user]);

  const params = new URLSearchParams();
  if (typeFilter) params.set("type", typeFilter);
  if (statusFilter) params.set("status", statusFilter);

  const { data: messages = [], isLoading, refetch } = useQuery<SupportMessage[]>({
    queryKey: ["admin-support-messages", typeFilter, statusFilter],
    queryFn: async () => {
      const t = await (user as any).getIdToken();
      setToken(t);
      const res = await fetch(`/api/admin/support-messages?${params}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && !!isAdmin,
  });

  const filtered = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q) ||
      (m.phone || "").includes(q)
    );
  });

  const openCount = messages.filter((m) => m.status === "open").length;
  const repliedCount = messages.filter((m) => m.status === "replied").length;
  const supportCount = messages.filter((m) => m.type === "support").length;
  const feedbackCount = messages.filter((m) => m.type === "feedback").length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RangoliLoader size={64} />
      </div>
    );
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
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5 max-w-3xl mx-auto" data-testid="admin-support-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Support &amp; Live Chat</h1>
          <p className="text-sm text-muted-foreground">Conversations and messages from devotees</p>
        </div>
        <button
          onClick={() => refetch()}
          className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          data-testid="button-refresh"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      {token && <LiveChatConsole token={token} />}

      <div className="pt-2">
        <h2 className="text-lg font-semibold">Support &amp; Feedback messages</h2>
        <p className="text-xs text-muted-foreground">Form submissions from devotees</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Support", value: supportCount, color: "text-rose-600 bg-rose-50" },
          { label: "Feedback", value: feedbackCount, color: "text-blue-600 bg-blue-50" },
          { label: "Open", value: openCount, color: "text-amber-600 bg-amber-50" },
          { label: "Replied", value: repliedCount, color: "text-green-600 bg-green-50" },
        ].map((chip) => (
          <div key={chip.label} className={`rounded-xl px-4 py-3 ${chip.color}`} data-testid={`chip-${chip.label.toLowerCase()}`}>
            <p className="text-xl font-bold">{chip.value}</p>
            <p className="text-xs font-medium">{chip.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(["", "support", "feedback"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 transition-colors ${typeFilter === t ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-muted/50"}`}
              data-testid={`filter-type-${t || "all"}`}
            >
              {t === "" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(["", "open", "replied"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-muted/50"}`}
              data-testid={`filter-status-${s || "all"}`}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by name, email, subject or message…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        data-testid="input-search"
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <RangoliLoader size={48} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-empty">
          No messages found.
        </div>
      ) : (
        <div className="space-y-3" data-testid="list-messages">
          {filtered.map((msg) => (
            <MessageRow key={msg.id} msg={msg} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}
