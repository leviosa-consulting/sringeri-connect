import { useState, useMemo, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, History, MapPin, Users, Heart, Home, Loader2, RefreshCw, ChevronDown, Filter, X, Camera, Trash2, Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { auth } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";

const PAGE_SIZE = 20;

function parseDateStr(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (parts) {
    const d = new Date(`${parts[2]} ${parts[1]}, ${parts[3]}`);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function filterByDateRange<T>(items: T[], dateExtractor: (item: T) => string | undefined | null, fromDate: string, toDate: string): T[] {
  if (!fromDate && !toDate) return items;
  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate + "T23:59:59") : null;
  return items.filter(item => {
    const parsed = parseDateStr(dateExtractor(item));
    if (!parsed) return true;
    if (from && parsed < from) return false;
    if (to && parsed > to) return false;
    return true;
  });
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
        } else {
          if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const [_, setLocation] = useLocation();
  const { profile, user, logout, devoteeData, devoteeLoading, refreshDevoteeData, avatarUrl } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [sevasOpen, setSevasOpen] = useState(false);
  const [donationsOpen, setDonationsOpen] = useState(false);
  const [accommodationsOpen, setAccommodationsOpen] = useState(false);
  const [kartasOpen, setKartasOpen] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);

  interface NakshatraOption { id: number; name: string; nameK: string; rashiIds: string; }
  interface RashiOption { id: number; name: string; nameK: string; }
  const [editingKarta, setEditingKarta] = useState<{ id: number } | null>(null);
  const [kartaSaving, setKartaSaving] = useState(false);
  const [kartaName, setKartaName] = useState("");
  const [kartaNameK, setKartaNameK] = useState("");
  const [kartaCity, setKartaCity] = useState("");
  const [kartaGotra, setKartaGotra] = useState("");
  const [kartaGotraK, setKartaGotraK] = useState("");
  const [kartaNakshatraId, setKartaNakshatraId] = useState<string>("");
  const [kartaRashiId, setKartaRashiId] = useState<string>("");
  const [nakshatras, setNakshatras] = useState<NakshatraOption[]>([]);
  const [rashis, setRashis] = useState<RashiOption[]>([]);
  const [nameTranslitTimer, setNameTranslitTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [gotraTranslitTimer, setGotraTranslitTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [sevasShown, setSevasShown] = useState(PAGE_SIZE);
  const [donationsShown, setDonationsShown] = useState(PAGE_SIZE);
  const [accommodationsShown, setAccommodationsShown] = useState(PAGE_SIZE);

  const [sevaFilterOpen, setSevaFilterOpen] = useState(false);
  const [sevaFromDate, setSevaFromDate] = useState("");
  const [sevaToDate, setSevaToDate] = useState("");

  const [donationFilterOpen, setDonationFilterOpen] = useState(false);
  const [donationFromDate, setDonationFromDate] = useState("");
  const [donationToDate, setDonationToDate] = useState("");

  const [accomFilterOpen, setAccomFilterOpen] = useState(false);
  const [accomFromDate, setAccomFromDate] = useState("");
  const [accomToDate, setAccomToDate] = useState("");

  const displayName = devoteeData?.name || profile?.name || user?.displayName || "Devotee";
  const email = devoteeData?.email || profile?.email || user?.email || "";
  const phone = devoteeData?.mobile || profile?.phone || "";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    try {
      setUploadingPhoto(true);
      const dataUrl = await resizeImage(file, 200);
      const key = `sringeri-avatar-${auth.currentUser.uid}`;
      localStorage.setItem(key, dataUrl);
      window.dispatchEvent(new Event("firebase-profile-updated"));
    } catch (err) {
      console.error("Failed to update profile photo:", err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("");

  const startEditing = () => {
    setEditName(devoteeData?.name || profile?.name || user?.displayName || "");
    setEditMobile(devoteeData?.mobile || profile?.phone || "");
    setEditEmail(devoteeData?.email || profile?.email || user?.email || "");
    setEditCity(devoteeData?.city || "");
    setEditCountryCode(devoteeData?.countryCode || "+91");
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/onlineDevotee/${user.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName,
          countryCode: editCountryCode,
          mobile: editMobile,
          city: editCity,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to update profile");
      }
      toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
      setEditing(false);
      await refreshDevoteeData();
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast({ title: "Update Failed", description: err.message || "Could not save profile. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const transliterate = async (text: string): Promise<string> => {
    try {
      const res = await fetch(`/api/transliterate?text=${encodeURIComponent(text)}`);
      if (res.ok) {
        const data = await res.json();
        return data.transliteration || data.result || text;
      }
    } catch {}
    return text;
  };

  const openKartaEdit = async (karta: { id?: number; name?: string; nameK?: string; city?: string; gotra?: string; gotraK?: string; nakshatraId?: number; rashiId?: number }) => {
    if (!karta.id) return;
    setEditingKarta({ id: karta.id });
    setKartaName(karta.name || "");
    setKartaNameK(karta.nameK || "");
    setKartaCity(karta.city || "");
    setKartaGotra(karta.gotra || "");
    setKartaGotraK(karta.gotraK || "");
    setKartaNakshatraId(karta.nakshatraId ? String(karta.nakshatraId) : "");
    setKartaRashiId(karta.rashiId ? String(karta.rashiId) : "");
    let loadedNakshatras = nakshatras;
    let loadedRashis = rashis;
    if (nakshatras.length === 0 || rashis.length === 0) {
      try {
        const [nRes, rRes] = await Promise.all([
          nakshatras.length === 0 ? fetch("/api/nakshatras") : Promise.resolve(null),
          rashis.length === 0 ? fetch("/api/rashis") : Promise.resolve(null),
        ]);
        if (nRes && nRes.ok) { loadedNakshatras = await nRes.json(); setNakshatras(loadedNakshatras); }
        if (rRes && rRes.ok) { loadedRashis = await rRes.json(); setRashis(loadedRashis); }
      } catch {
        toast({ title: "Failed to load options", description: "Could not load nakshatra/rashi options.", variant: "destructive" });
      }
    }
    if (karta.nakshatraId && !karta.rashiId) {
      const nak = loadedNakshatras.find((n: NakshatraOption) => n.id === karta.nakshatraId);
      if (nak && nak.rashiIds) {
        setKartaRashiId(nak.rashiIds.split(",")[0].trim());
      }
    }
  };

  const handleKartaNameChange = (val: string) => {
    setKartaName(val);
    if (nameTranslitTimer) clearTimeout(nameTranslitTimer);
    if (val.trim()) {
      const t = setTimeout(async () => {
        const k = await transliterate(val);
        setKartaNameK(k);
      }, 500);
      setNameTranslitTimer(t);
    }
  };

  const handleKartaGotraChange = (val: string) => {
    setKartaGotra(val);
    if (gotraTranslitTimer) clearTimeout(gotraTranslitTimer);
    if (val.trim()) {
      const t = setTimeout(async () => {
        const k = await transliterate(val);
        setKartaGotraK(k);
      }, 500);
      setGotraTranslitTimer(t);
    }
  };

  const handleNakshatraChange = (nakshatraIdStr: string) => {
    setKartaNakshatraId(nakshatraIdStr);
    const nak = nakshatras.find(n => String(n.id) === nakshatraIdStr);
    if (nak && nak.rashiIds) {
      const firstRashiId = nak.rashiIds.split(",")[0].trim();
      setKartaRashiId(firstRashiId);
    }
  };

  const handleSaveKarta = async () => {
    if (!user || !editingKarta?.id) return;
    setKartaSaving(true);
    try {
      const token = await user.getIdToken();
      const body: { name: string; nameK: string; city: string; gotra: string; gotraK: string; nakshatraId?: number; rashiId?: number } = {
        name: kartaName,
        nameK: kartaNameK,
        city: kartaCity,
        gotra: kartaGotra,
        gotraK: kartaGotraK,
      };
      if (kartaNakshatraId) body.nakshatraId = Number(kartaNakshatraId);
      if (kartaRashiId) body.rashiId = Number(kartaRashiId);
      const res = await fetch(`/api/devoteeKarta/${editingKarta.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to update karta");
      }
      toast({ title: "Karta Updated", description: "Seva karta has been saved successfully." });
      setEditingKarta(null);
      await refreshDevoteeData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save karta.";
      toast({ title: "Update Failed", description: message, variant: "destructive" });
    } finally {
      setKartaSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleDeleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      setDeleting(true);
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Server failed to delete account data");
      }
      const key = `sringeri-avatar-${currentUser.uid}`;
      localStorage.removeItem(key);
      await deleteUser(currentUser);
      setLocation("/");
    } catch (err: any) {
      if (err?.code === "auth/requires-recent-login") {
        alert("For security, please sign out and sign back in before deleting your account.");
      } else {
        console.error("Failed to delete account:", err);
        alert("Failed to delete account. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return "₹0";
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(numAmount);
  };

  const filteredSevas = useMemo(() => {
    const sevas = devoteeData?.pastSevas || [];
    return filterByDateRange(sevas, s => s.sevaDate, sevaFromDate, sevaToDate);
  }, [devoteeData?.pastSevas, sevaFromDate, sevaToDate]);

  const filteredDonations = useMemo(() => {
    const donations = devoteeData?.pastDonations || [];
    return filterByDateRange(donations, d => d.donationDate, donationFromDate, donationToDate);
  }, [devoteeData?.pastDonations, donationFromDate, donationToDate]);

  const filteredAccommodations = useMemo(() => {
    const accommodations = devoteeData?.pastAccommodations || [];
    return filterByDateRange(accommodations, a => a.reservationFor || a.reservedDate || a.checkIn, accomFromDate, accomToDate);
  }, [devoteeData?.pastAccommodations, accomFromDate, accomToDate]);

  return (
    <div className="pb-24 lg:pb-8">
      {/* Profile Header */}
      <div className="bg-primary pt-12 pb-20 px-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold" data-testid="text-username">{displayName}</h1>
            <p className="opacity-90 text-sm" data-testid="text-email">{email}</p>
            {phone && <p className="opacity-80 text-xs mt-1" data-testid="text-phone">{phone}</p>}
            {devoteeData?.city && <p className="opacity-80 text-xs mt-0.5" data-testid="text-city">{devoteeData.city}</p>}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={startEditing}
              data-testid="button-edit-profile"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={refreshDevoteeData}
              disabled={devoteeLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-5 w-5 ${devoteeLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={(open) => { if (!open && !saving) setEditing(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Name"
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Country Code</label>
              <input
                type="text"
                value={editCountryCode}
                onChange={e => setEditCountryCode(e.target.value)}
                placeholder="+91"
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                data-testid="input-edit-country-code"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Mobile Number</label>
              <input
                type="tel"
                value={editMobile}
                onChange={e => setEditMobile(e.target.value)}
                placeholder="Mobile Number"
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                data-testid="input-edit-mobile"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <input
                type="text"
                value={editCity}
                onChange={e => setEditCity(e.target.value)}
                placeholder="City"
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                data-testid="input-edit-city"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={saving}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              data-testid="button-save-profile"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="px-4 -mt-10 relative z-20 space-y-4">
        {/* Tabs for History & Saved Info */}
        <Tabs defaultValue="history" className="w-full" data-testid="tabs-profile">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved">Saved Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="space-y-3 mt-4">
            {devoteeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Past Sevas - Collapsible */}
                <Collapsible open={sevasOpen} onOpenChange={(open) => { setSevasOpen(open); if (!open) setSevasShown(PAGE_SIZE); }}>
                  <Card data-testid="card-past-sevas">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-base font-serif flex items-center gap-2">
                          <History className="h-4 w-4 text-primary" />
                          <span className="flex-1">Past Sevas ({devoteeData?.pastSevas?.length || 0})</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${sevasOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {/* Date Filter */}
                        <div className="mb-3">
                          <button
                            onClick={() => setSevaFilterOpen(!sevaFilterOpen)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            data-testid="button-seva-filter-toggle"
                          >
                            <Filter className="h-3 w-3" />
                            Filter by date
                          </button>
                          {sevaFilterOpen && (
                            <div className="flex items-center gap-2 mt-2">
                              <input type="date" value={sevaFromDate} onChange={e => { setSevaFromDate(e.target.value); setSevasShown(PAGE_SIZE); }} className="text-xs border rounded px-2 py-1 flex-1 bg-background" data-testid="input-seva-from-date" />
                              <span className="text-xs text-muted-foreground">to</span>
                              <input type="date" value={sevaToDate} onChange={e => { setSevaToDate(e.target.value); setSevasShown(PAGE_SIZE); }} className="text-xs border rounded px-2 py-1 flex-1 bg-background" data-testid="input-seva-to-date" />
                              {(sevaFromDate || sevaToDate) && (
                                <button onClick={() => { setSevaFromDate(""); setSevaToDate(""); setSevasShown(PAGE_SIZE); }} className="p-1 hover:bg-muted rounded" data-testid="button-seva-filter-clear">
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {filteredSevas.length > 0 ? (
                          <div className="space-y-0">
                            {filteredSevas.slice(0, sevasShown).map((seva, index) => (
                              <div key={seva.id || index} className="flex justify-between items-start py-2 border-b last:border-0" data-testid={`row-seva-${seva.id || index}`}>
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="font-medium text-sm truncate">{seva.sevaName || "Seva"}</div>
                                  <div className="text-xs text-muted-foreground">{seva.deityName}</div>
                                  <div className="text-xs text-muted-foreground">For: {seva.devoteeName}</div>
                                  <div className="text-xs text-muted-foreground">{seva.sevaDate}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-medium text-sm text-primary">{formatCurrency(seva.amount || "0")}</div>
                                  <div className="text-xs text-muted-foreground">{seva.performedAs}</div>
                                  <div className="text-[10px] text-green-600">{seva.performedStatus}</div>
                                </div>
                              </div>
                            ))}
                            {sevasShown < filteredSevas.length && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-xs text-primary"
                                onClick={() => setSevasShown(prev => prev + PAGE_SIZE)}
                                data-testid="button-load-more-sevas"
                              >
                                Load More ({filteredSevas.length - sevasShown} remaining)
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-sevas">No past sevas found</p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Past Donations - Collapsible */}
                <Collapsible open={donationsOpen} onOpenChange={(open) => { setDonationsOpen(open); if (!open) setDonationsShown(PAGE_SIZE); }}>
                  <Card data-testid="card-past-donations">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-base font-serif flex items-center gap-2">
                          <Heart className="h-4 w-4 text-secondary" />
                          <span className="flex-1">Past Donations ({devoteeData?.pastDonations?.length || 0})</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${donationsOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {/* Date Filter */}
                        <div className="mb-3">
                          <button
                            onClick={() => setDonationFilterOpen(!donationFilterOpen)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            data-testid="button-donation-filter-toggle"
                          >
                            <Filter className="h-3 w-3" />
                            Filter by date
                          </button>
                          {donationFilterOpen && (
                            <div className="flex items-center gap-2 mt-2">
                              <input type="date" value={donationFromDate} onChange={e => { setDonationFromDate(e.target.value); setDonationsShown(PAGE_SIZE); }} className="text-xs border rounded px-2 py-1 flex-1 bg-background" data-testid="input-donation-from-date" />
                              <span className="text-xs text-muted-foreground">to</span>
                              <input type="date" value={donationToDate} onChange={e => { setDonationToDate(e.target.value); setDonationsShown(PAGE_SIZE); }} className="text-xs border rounded px-2 py-1 flex-1 bg-background" data-testid="input-donation-to-date" />
                              {(donationFromDate || donationToDate) && (
                                <button onClick={() => { setDonationFromDate(""); setDonationToDate(""); setDonationsShown(PAGE_SIZE); }} className="p-1 hover:bg-muted rounded" data-testid="button-donation-filter-clear">
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {filteredDonations.length > 0 ? (
                          <div className="space-y-0">
                            {filteredDonations.slice(0, donationsShown).map((donation, index) => (
                              <div key={donation.id || index} className="py-2 border-b last:border-0" data-testid={`row-donation-${donation.id || index}`}>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="font-medium text-sm">{donation.payeeName}</div>
                                    <div className="text-xs text-muted-foreground">{donation.donationDate}</div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="font-medium text-sm text-secondary">{formatCurrency(donation.totalAmount || 0)}</div>
                                    {donation.requireTaxReceipt === "Yes" && (
                                      <div className="text-[10px] text-blue-600">Tax Receipt</div>
                                    )}
                                  </div>
                                </div>
                                {donation.details && donation.details.length > 0 && (
                                  <div className="mt-2 pl-2 border-l-2 border-secondary/20 space-y-1">
                                    {donation.details.map((detail, dIdx) => (
                                      <div key={detail.id || dIdx} className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{detail.causeName}</span>
                                        <span className="text-secondary ml-1">({detail.categoryName})</span>
                                        <span className="ml-1">- {formatCurrency(detail.donationAmount || 0)}</span>
                                        {detail.donationInTheNameOf && (
                                          <span className="block text-[10px]">In name of: {detail.donationInTheNameOf}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {donationsShown < filteredDonations.length && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-xs text-primary"
                                onClick={() => setDonationsShown(prev => prev + PAGE_SIZE)}
                                data-testid="button-load-more-donations"
                              >
                                Load More ({filteredDonations.length - donationsShown} remaining)
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-donations">No past donations found</p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Past Accommodations - Collapsible */}
                <Collapsible open={accommodationsOpen} onOpenChange={(open) => { setAccommodationsOpen(open); if (!open) setAccommodationsShown(PAGE_SIZE); }}>
                  <Card data-testid="card-past-accommodations">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-base font-serif flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-600" />
                          <span className="flex-1">Past Accommodations ({devoteeData?.pastAccommodations?.length || 0})</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${accommodationsOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {/* Date Filter */}
                        <div className="mb-3">
                          <button
                            onClick={() => setAccomFilterOpen(!accomFilterOpen)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            data-testid="button-accom-filter-toggle"
                          >
                            <Filter className="h-3 w-3" />
                            Filter by date
                          </button>
                          {accomFilterOpen && (
                            <div className="flex items-center gap-2 mt-2">
                              <input type="date" value={accomFromDate} onChange={e => { setAccomFromDate(e.target.value); setAccommodationsShown(PAGE_SIZE); }} className="text-xs border rounded px-2 py-1 flex-1 bg-background" data-testid="input-accom-from-date" />
                              <span className="text-xs text-muted-foreground">to</span>
                              <input type="date" value={accomToDate} onChange={e => { setAccomToDate(e.target.value); setAccommodationsShown(PAGE_SIZE); }} className="text-xs border rounded px-2 py-1 flex-1 bg-background" data-testid="input-accom-to-date" />
                              {(accomFromDate || accomToDate) && (
                                <button onClick={() => { setAccomFromDate(""); setAccomToDate(""); setAccommodationsShown(PAGE_SIZE); }} className="p-1 hover:bg-muted rounded" data-testid="button-accom-filter-clear">
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {filteredAccommodations.length > 0 ? (
                          <div className="space-y-0">
                            {filteredAccommodations.slice(0, accommodationsShown).map((booking, index) => {
                              const bookedDate = booking.reservationFor || booking.reservedDate || booking.checkIn || "";
                              const buildingLabel = booking.building || booking.buildingName || booking.roomName || booking.roomType || "Room";
                              const amount = booking.totalAmount || booking.rent;
                              return (
                              <div key={booking.id || index} className="py-2 border-b last:border-0" data-testid={`row-accommodation-${booking.id || index}`}>
                                {booking.id && (
                                  <div className="font-semibold text-base text-primary mb-1" data-testid={`text-accom-id-${booking.id}`}>#{booking.id}</div>
                                )}
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="font-medium text-sm">{buildingLabel}</div>
                                    {bookedDate && (
                                      <div className="text-xs text-muted-foreground">Booked for: {bookedDate}</div>
                                    )}
                                    {booking.occupantName1 && (
                                      <div className="text-xs text-muted-foreground">{booking.occupantName1}{booking.occupantName2 ? `, ${booking.occupantName2}` : ""}</div>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    {amount != null && (
                                      <div className="font-medium text-sm text-blue-600">
                                        {formatCurrency(amount)}
                                      </div>
                                    )}
                                    {booking.deposit != null && Number(booking.deposit) > 0 && (
                                      <div className="text-[10px] text-muted-foreground">
                                        Deposit: {formatCurrency(booking.deposit)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                            {accommodationsShown < filteredAccommodations.length && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-xs text-primary"
                                onClick={() => setAccommodationsShown(prev => prev + PAGE_SIZE)}
                                data-testid="button-load-more-accommodations"
                              >
                                Load More ({filteredAccommodations.length - accommodationsShown} remaining)
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-accommodations">No past accommodations found</p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-4">
            {devoteeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Collapsible open={kartasOpen} onOpenChange={setKartasOpen}>
                  <Card data-testid="card-seva-kartas">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-base font-serif flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="flex-1">Seva Kartas ({devoteeData?.kartas?.length || 0})</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${kartasOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {devoteeData?.kartas && devoteeData.kartas.length > 0 ? (
                          <div className="space-y-0">
                            {devoteeData.kartas.map((karta, index) => (
                              <div key={karta.id || index} className="py-2 border-b last:border-0" data-testid={`row-karta-${karta.id || index}`}>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{karta.name}</div>
                                    {karta.nameK && <div className="text-xs text-muted-foreground">{karta.nameK}</div>}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={(e) => { e.stopPropagation(); openKartaEdit(karta); }}
                                    data-testid={`button-edit-karta-${karta.id || index}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  {karta.gotra && <div>Gothra: {karta.gotra} {karta.gotraK && `(${karta.gotraK})`}</div>}
                                  {karta.nakshatraDisp && <div>Nakshatra: {karta.nakshatraDisp}</div>}
                                  {karta.rashiDisp && <div>Rashi: {karta.rashiDisp}</div>}
                                  {karta.city && <div>City: {karta.city}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-kartas">No seva kartas saved</p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Collapsible open={addressesOpen} onOpenChange={setAddressesOpen}>
                  <Card data-testid="card-addresses">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-base font-serif flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span className="flex-1">Saved Addresses ({devoteeData?.addresses?.length || 0})</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${addressesOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {devoteeData?.addresses && devoteeData.addresses.length > 0 ? (
                          <div className="space-y-0">
                            {devoteeData.addresses.map((address, index) => (
                              <div key={address.id || index} className="py-2 border-b last:border-0" data-testid={`row-address-${address.id || index}`}>
                                <div className="font-medium text-sm">{address.addresseeName || "Address"}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {address.addressLine1}
                                  {address.addressLine2 && <>, {address.addressLine2}</>}
                                </div>
                                {address.landmark && (
                                  <div className="text-xs text-muted-foreground">Near: {address.landmark}</div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {[address.city, address.state, address.country, address.pincode]
                                    .filter(Boolean)
                                    .join(", ")}
                                </div>
                                {address.alternatePhone && (
                                  <div className="text-xs text-muted-foreground mt-1">Phone: {address.alternatePhone}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-addresses">No addresses saved</p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Account Actions */}
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/5 text-sm"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>

          <div className="mt-6 pt-4 border-t border-muted/30">
            <p className="text-xs text-muted-foreground text-center mb-2">
              If you no longer wish to keep your account data with the app, you can delete your account below.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 text-xs"
                data-testid="button-delete-account"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all associated data including quiz history, badges, and analytics. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  data-testid="button-confirm-delete"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Dialog open={!!editingKarta} onOpenChange={(open) => { if (!open) { setEditingKarta(null); if (nameTranslitTimer) clearTimeout(nameTranslitTimer); if (gotraTranslitTimer) clearTimeout(gotraTranslitTimer); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Seva Karta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="karta-name" className="text-xs">Name</Label>
                <Input id="karta-name" value={kartaName} onChange={(e) => handleKartaNameChange(e.target.value)} className="mt-1" data-testid="input-karta-name" />
              </div>
              <div>
                <Label htmlFor="karta-nameK" className="text-xs">Name (Kannada)</Label>
                <Input id="karta-nameK" value={kartaNameK} onChange={(e) => setKartaNameK(e.target.value)} className="mt-1" data-testid="input-karta-nameK" />
              </div>
              <div>
                <Label htmlFor="karta-city" className="text-xs">City</Label>
                <Input id="karta-city" value={kartaCity} onChange={(e) => setKartaCity(e.target.value)} className="mt-1" data-testid="input-karta-city" />
              </div>
              <div>
                <Label htmlFor="karta-gotra" className="text-xs">Gothra</Label>
                <Input id="karta-gotra" value={kartaGotra} onChange={(e) => handleKartaGotraChange(e.target.value)} className="mt-1" data-testid="input-karta-gotra" />
              </div>
              <div>
                <Label htmlFor="karta-gotraK" className="text-xs">Gothra (Kannada)</Label>
                <Input id="karta-gotraK" value={kartaGotraK} onChange={(e) => setKartaGotraK(e.target.value)} className="mt-1" data-testid="input-karta-gotraK" />
              </div>
              <div>
                <Label className="text-xs">Nakshatra</Label>
                <Select value={kartaNakshatraId} onValueChange={handleNakshatraChange}>
                  <SelectTrigger className="mt-1" data-testid="select-karta-nakshatra">
                    <SelectValue placeholder="Select Nakshatra" />
                  </SelectTrigger>
                  <SelectContent>
                    {nakshatras.map(n => (
                      <SelectItem key={n.id} value={String(n.id)}>{n.name} ({n.nameK})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rashi</Label>
                <Select value={kartaRashiId} onValueChange={setKartaRashiId}>
                  <SelectTrigger className="mt-1" data-testid="select-karta-rashi">
                    <SelectValue placeholder="Select Rashi" />
                  </SelectTrigger>
                  <SelectContent>
                    {rashis.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name} ({r.nameK})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setEditingKarta(null)} data-testid="button-cancel-karta-edit">Cancel</Button>
              <Button size="sm" onClick={handleSaveKarta} disabled={kartaSaving} data-testid="button-save-karta">
                {kartaSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
