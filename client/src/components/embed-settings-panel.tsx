import { useState, useEffect } from "react";
import { Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Remote control for the widget embedded on sringeri.net. The website team
 * pastes the snippet once; everything below is changed from here.
 */
interface EmbedSettings {
  enabled: boolean;
  greeting: string;
  accent: string;
  position: string;
  origins: string;
  defaultOrigins: string[];
}

export default function EmbedSettingsPanel({ authFetch }: { authFetch: (url: string, init?: RequestInit) => Promise<Response> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<EmbedSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || settings) return;
    void (async () => {
      try {
        const res = await authFetch("/api/admin/live-chat/embed-settings");
        if (res.ok) setSettings(await res.json());
      } catch { /* ignore */ }
    })();
  }, [open, settings, authFetch]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/live-chat/embed-settings", {
        method: "POST",
        body: JSON.stringify({
          enabled: settings.enabled,
          greeting: settings.greeting,
          accent: settings.accent,
          position: settings.position,
          origins: settings.origins,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setSettings(data);
      toast({ title: "Website chat settings saved" });
    } catch (err: any) {
      toast({ title: "Not saved", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const snippet = `<script src="${window.location.origin}/embed/live-chat.js" defer></script>`;

  return (
    <div className="bg-white border border-border rounded-xl" data-testid="panel-embed-settings">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        data-testid="button-toggle-embed-settings"
      >
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Chat on sringeri.net</span>
        <span className="ml-auto text-xs text-muted-foreground">{open ? "Hide" : "Settings & install code"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {!settings ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  data-testid="checkbox-embed-enabled"
                />
                Show the chat widget on the website
              </label>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Opening greeting for website visitors</p>
                <textarea
                  value={settings.greeting}
                  onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
                  rows={3}
                  maxLength={600}
                  className="w-full text-sm border border-border rounded-lg p-2 resize-none"
                  data-testid="input-embed-greeting"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Colour</p>
                  <input
                    type="color"
                    value={settings.accent}
                    onChange={(e) => setSettings({ ...settings, accent: e.target.value })}
                    className="h-9 w-16 border border-border rounded"
                    data-testid="input-embed-accent"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Corner</p>
                  <select
                    value={settings.position}
                    onChange={(e) => setSettings({ ...settings, position: e.target.value })}
                    className="h-9 text-sm border border-border rounded-lg px-2"
                    data-testid="select-embed-position"
                  >
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Extra websites allowed to use this chat (comma separated). Always allowed: {settings.defaultOrigins.join(", ")}
                </p>
                <input
                  value={settings.origins}
                  onChange={(e) => setSettings({ ...settings, origins: e.target.value })}
                  placeholder="https://another-site.org"
                  className="w-full text-sm border border-border rounded-lg p-2"
                  data-testid="input-embed-origins"
                />
              </div>

              <Button size="sm" onClick={save} disabled={saving} data-testid="button-save-embed-settings">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save website settings"}
              </Button>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Give this one line to the website team — paste it before <code>&lt;/body&gt;</code> on every page.
                </p>
                <code className="block text-[11px] bg-muted rounded-lg p-2 break-all" data-testid="text-embed-snippet">
                  {snippet}
                </code>
                <button
                  onClick={() => { void navigator.clipboard.writeText(snippet); toast({ title: "Install code copied" }); }}
                  className="text-xs text-primary underline mt-1"
                  data-testid="button-copy-embed-snippet"
                >
                  Copy install code
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
