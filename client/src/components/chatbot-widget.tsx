import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";

interface SuggestedAction {
  label: string;
  action: string;
}

interface ChatMessage {
  role: "user" | "bot";
  content: string;
  suggestedActions?: SuggestedAction[];
  isLoading?: boolean;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    let processed: React.ReactNode = line;

    if (line.startsWith("**") && line.endsWith("**") && !line.includes("**", 2)) {
      elements.push(<strong key={i} className="block mt-2 mb-1">{line.slice(2, -2)}</strong>);
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
      if (boldMatch && boldMatch.index !== undefined) {
        if (!firstMatch || boldMatch.index < firstMatch.index) {
          firstMatch = { type: "bold", index: boldMatch.index, full: boldMatch[0], content: boldMatch[1] };
        }
      }
      if (italicMatch && italicMatch.index !== undefined) {
        if (!firstMatch || italicMatch.index < firstMatch.index) {
          firstMatch = { type: "italic", index: italicMatch.index, full: italicMatch[0], content: italicMatch[1] };
        }
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
      } else if (firstMatch.type === "italic") {
        parts.push(<em key={partKey++} className="text-muted-foreground">{firstMatch.content}</em>);
      }

      remaining = remaining.substring(firstMatch.index + firstMatch.full.length);
    }

    if (parts.length > 0) {
      const isBullet = line.trimStart().startsWith("•");
      if (isBullet) {
        elements.push(<div key={i} className="pl-2 py-0.5">{parts}</div>);
      } else if (line.trim() === "") {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(<div key={i} className="py-0.5">{parts}</div>);
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
  });

  return <div className="space-y-0">{elements}</div>;
}

const INITIAL_ACTIONS: SuggestedAction[] = [
  { label: "🙏 Donations", action: "donation" },
  { label: "🏨 Accommodation", action: "accommodation" },
  { label: "📅 Today's Panchanga", action: "panchanga" },
  { label: "🎉 Events", action: "events" },
  { label: "📢 Announcements", action: "announcements" },
  { label: "ℹ️ Services", action: "services" },
];

const INITIAL_MESSAGE: ChatMessage = {
  role: "bot",
  content: "Namaste! 🙏 I am Sringeri Sahayak. I can help you with information about donations, accommodation, panchanga, events, and more.\n\nChoose a topic below or type your question.",
  suggestedActions: INITIAL_ACTIONS,
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; dragged: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const getDefaultPos = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLg = w >= 1024;
    return { x: w - 56 - 16, y: h - (isLg ? 32 : 96) - 56 };
  }, []);

  useEffect(() => {
    setBtnPos(getDefaultPos());
    const onResize = () => {
      setBtnPos((prev) => {
        if (!prev) return getDefaultPos();
        return {
          x: Math.min(prev.x, window.innerWidth - 56),
          y: Math.min(prev.y, window.innerHeight - 56),
        };
      });
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
    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragRef.current.startPosX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragRef.current.startPosY + dy));
    setBtnPos({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const wasDrag = dragRef.current?.dragged;
    dragRef.current = null;
    if (!wasDrag) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);



  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const loadingMsg: ChatMessage = { role: "bot", content: "", isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      setMessages((prev) => {
        const updated = prev.filter((m) => !m.isLoading);
        return [
          ...updated,
          {
            role: "bot" as const,
            content: data.reply,
            suggestedActions: data.suggestedActions,
          },
        ];
      });
    } catch {
      setMessages((prev) => {
        const updated = prev.filter((m) => !m.isLoading);
        return [
          ...updated,
          {
            role: "bot" as const,
            content: "Sorry, I couldn't process your request. Please try again.",
            suggestedActions: INITIAL_ACTIONS,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setIsLoading(false);
  };

  const handleAction = (action: string) => {
    if (action.startsWith("navigate:")) {
      const path = action.replace("navigate:", "");
      setLocation(path);
      setIsOpen(false);
      return;
    }
    sendMessage(action);
  };

  return (
    <>
      {!isOpen && btnPos && (
        <button
          ref={btnRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="fixed z-50 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ left: btnPos.x, top: btnPos.y }}
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-6 w-6 text-white pointer-events-none" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-24 lg:bottom-8 right-4 z-50" data-testid="chatbot-widget">
        <Card className="w-[350px] h-[500px] shadow-2xl border-primary/20 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
          <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between rounded-t-xl shrink-0">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-white/20 border border-white/40">
                <AvatarImage src="/assets/lamp-icon.jpg" />
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base font-serif">Sringeri Sahayak</CardTitle>
                <p className="text-xs opacity-80">Verified information only</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="text-white hover:bg-white/20 h-8 w-8"
                title="Clear chat"
                data-testid="button-clear-chat"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8"
                data-testid="button-close-chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden bg-background/50 min-h-0">
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted text-foreground rounded-tl-none"
                        }`}
                        data-testid={`chat-message-${msg.role}-${i}`}
                      >
                        {msg.isLoading ? (
                          <div className="flex items-center gap-2 py-1">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground">Looking up information...</span>
                          </div>
                        ) : msg.role === "bot" ? (
                          renderMarkdown(msg.content)
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>

                    {msg.suggestedActions && msg.suggestedActions.length > 0 && !msg.isLoading && (
                      <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                        {msg.suggestedActions.map((action, j) => (
                          <button
                            key={j}
                            onClick={() => handleAction(action.action)}
                            disabled={isLoading}
                            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50"
                            data-testid={`button-action-${action.action}-${i}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t bg-background shrink-0">
            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <Input
                ref={inputRef}
                placeholder="Ask about sevas, donations..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} data-testid="button-send-chat">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
        </div>
      )}
    </>
  );
}
