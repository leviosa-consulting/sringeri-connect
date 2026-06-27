import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { RangoliLoader } from "@/components/rangoli-loader";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  { value: "super_admin", label: "Super Admin", description: "Full access to everything" },
  { value: "accounts", label: "Accounts", description: "Transactions, reconciliation, logs" },
  { value: "support", label: "Support", description: "Support & feedback inbox" },
  { value: "quiz", label: "Quiz", description: "Quiz management & analytics" },
  { value: "analytics", label: "Analytics", description: "App analytics dashboard" },
];

type AdminRoleRow = {
  id: number;
  firebaseUid: string;
  email: string;
  role: string;
  grantedByUid: string | null;
  createdAt: string;
};

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    accounts: "bg-amber-100 text-amber-700",
    support: "bg-rose-100 text-rose-700",
    quiz: "bg-purple-100 text-purple-700",
    analytics: "bg-blue-100 text-blue-700",
  };
  const label = ROLES.find(r => r.value === role)?.label || role;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[role] || "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

export default function AdminRoles() {
  const { hasAdminRole, getToken, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newUid, setNewUid] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("analytics");

  const { data: roles = [], isLoading } = useQuery<AdminRoleRow[]>({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: hasAdminRole("super_admin"),
  });

  const grantMutation = useMutation({
    mutationFn: async ({ firebaseUid, email, role }: { firebaseUid: string; email: string; role: string }) => {
      const token = await getToken();
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firebaseUid, email, role }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to grant role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setNewUid("");
      setNewEmail("");
      setNewRole("analytics");
      toast({ title: "Role granted", description: "The role has been assigned." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Could not grant role.", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to revoke");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      toast({ title: "Role revoked", description: "The role has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Could not revoke.", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RangoliLoader size={64} />
      </div>
    );
  }

  if (!hasAdminRole("super_admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2" data-testid="text-access-denied">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">Only super admins can manage roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-6 max-w-3xl mx-auto" data-testid="admin-roles-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-sm text-muted-foreground">Grant or revoke admin access for portal users</p>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" /> Grant a Role
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Firebase UID"
            value={newUid}
            onChange={e => setNewUid(e.target.value)}
            data-testid="input-new-uid"
          />
          <Input
            placeholder="Email (for display)"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            data-testid="input-new-email"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setNewRole(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${newRole === r.value ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:bg-muted/50"}`}
              data-testid={`button-role-${r.value}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{ROLES.find(r => r.value === newRole)?.description}</p>
        <Button
          onClick={() => grantMutation.mutate({ firebaseUid: newUid.trim(), email: newEmail.trim(), role: newRole })}
          disabled={!newUid.trim() || !newEmail.trim() || grantMutation.isPending}
          data-testid="button-grant-role"
        >
          {grantMutation.isPending ? "Granting…" : "Grant Role"}
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Current Role Holders
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><RangoliLoader size={40} /></div>
        ) : roles.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm" data-testid="text-empty-roles">
            No roles have been granted yet.
          </div>
        ) : (
          <div className="space-y-2" data-testid="list-roles">
            {roles.map(row => (
              <div key={row.id} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl px-4 py-3" data-testid={`row-role-${row.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={row.role} />
                    <span className="text-sm font-medium text-foreground truncate">{row.email}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{row.firebaseUid}</p>
                  <p className="text-xs text-muted-foreground/60">
                    Granted {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate(row.id)}
                  disabled={revokeMutation.isPending}
                  className="shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  data-testid={`button-revoke-${row.id}`}
                  title="Revoke role"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
