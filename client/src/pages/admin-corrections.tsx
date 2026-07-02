import { useState } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Search, AlertCircle, PencilLine } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CorrectionRecord {
  [key: string]: any;
}

const RECORD_TYPES: { value: string; label: string }[] = [
  { value: "seva", label: "Seva" },
  { value: "donation", label: "Donation" },
  { value: "yatri", label: "Yatri" },
  { value: "fastline", label: "Fastline" },
];

function getField(t: CorrectionRecord, ...keys: string[]): string {
  for (const k of keys) {
    if (t[k] !== undefined && t[k] !== null && t[k] !== "") return String(t[k]);
  }
  return "—";
}

export default function AdminCorrections() {
  const { user, loading: authLoading, getToken, hasAdminRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = hasAdminRole("accounts");

  const [recordType, setRecordType] = useState("seva");
  const [referenceNo, setReferenceNo] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [bookingDate, setBookingDate] = useState("");

  const [records, setRecords] = useState<CorrectionRecord[]>([]);
  const [lastSearchedRecordType, setLastSearchedRecordType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [detailRecord, setDetailRecord] = useState<CorrectionRecord | null>(null);
  const [detailRecordType, setDetailRecordType] = useState<string>("");
  const [originalBookingDate, setOriginalBookingDate] = useState("");
  const [editBookingDate, setEditBookingDate] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasAnyFilter = [referenceNo, email, mobileNumber, bookingDate].some((v) => v.trim() !== "");

  async function handleSearch() {
    if (!isAdmin || !getToken) return;
    if (!hasAnyFilter) {
      toast({
        title: "Add a filter",
        description: "Enter a reference number, email, mobile number, or booking date to search.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/corrections/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recordType,
          referenceNo: referenceNo.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          bookingDate: bookingDate.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const list: CorrectionRecord[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setRecords(list);
      setLastSearchedRecordType(recordType);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load records");
      setRecords([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function closeDetailDialog() {
    setDetailRecord(null);
    setDetailRecordType("");
    setOriginalBookingDate("");
    setEditBookingDate("");
    setEditRemarks("");
    setSaveError(null);
  }

  async function handleSaveCorrection() {
    if (!detailRecord || !getToken) return;
    if (detailRecordType !== "yatri") {
      setSaveError("Editing is not yet supported for this record type.");
      return;
    }
    const recordId = getField(detailRecord, "id", "reservationId", "ID");
    if (recordId === "—") {
      setSaveError("Could not determine this record's ID.");
      return;
    }
    const trimmedBookingDate = editBookingDate.trim();
    const hasBookingDateChange = trimmedBookingDate !== "" && trimmedBookingDate !== originalBookingDate.trim();
    const hasRemarksChange = editRemarks.trim() !== "";
    if (!hasBookingDateChange && !hasRemarksChange) {
      setSaveError("Change the booking date or add a remark before saving.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/corrections/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recordType: detailRecordType,
          id: recordId,
          ...(hasBookingDateChange
            ? { bookingDate: trimmedBookingDate, originalBookingDate: originalBookingDate.trim() }
            : {}),
          ...(hasRemarksChange ? { remarks: editRemarks.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      toast({ title: "Record updated", description: "The correction was submitted successfully." });

      const updatedRecord: CorrectionRecord = { ...detailRecord };
      if (hasBookingDateChange) {
        if ("bookingDate" in updatedRecord) updatedRecord.bookingDate = trimmedBookingDate;
        if ("reservedDate" in updatedRecord) updatedRecord.reservedDate = trimmedBookingDate;
        if (!("bookingDate" in updatedRecord) && !("reservedDate" in updatedRecord)) {
          updatedRecord.bookingDate = trimmedBookingDate;
        }
      }
      const adminIdentity = user?.email || "you";
      const summaryParts: string[] = [];
      if (hasBookingDateChange) {
        summaryParts.push(`Booking date changed from ${originalBookingDate.trim() || "unknown"} to ${trimmedBookingDate}`);
      }
      if (hasRemarksChange) {
        summaryParts.push(editRemarks.trim());
      }
      const existingRemarks = getField(detailRecord, "remarks");
      const appendedRemark = `${summaryParts.join(" | ")} - ${adminIdentity}`;
      const newRemarksValue = existingRemarks !== "—" ? `${existingRemarks}|${appendedRemark}` : appendedRemark;
      updatedRecord.remarks = newRemarksValue;
      setRecords((prev) => prev.map((r) => (r === detailRecord ? updatedRecord : r)));
      closeDetailDialog();
    } catch (err: any) {
      setSaveError(err?.message || "Failed to update record");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RangoliLoader size={64} />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2" data-testid="text-access-denied">
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground/60">This page is only for authorized administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 lg:pb-8 space-y-5 max-w-6xl mx-auto" data-testid="admin-corrections-page">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="link-back-admin">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Corrections / Rectifications</h1>
          <p className="text-sm text-muted-foreground">Search a record to review and correct its details</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Record Type</label>
          <div className="flex flex-wrap gap-2">
            {RECORD_TYPES.map((rt) => (
              <button
                key={rt.value}
                type="button"
                onClick={() => setRecordType(rt.value)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  recordType === rt.value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                data-testid={`button-record-type-${rt.value}`}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Reference Number</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. SR2026070112345"
              className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-reference-no"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="devotee@example.com"
              className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Mobile Number</label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="9876543210"
              className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-mobile"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Booking Date</label>
            <input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-booking-date"
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={loading}
          className="w-full sm:w-auto"
          data-testid="button-search"
        >
          <Search className="h-4 w-4 mr-2" />
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" data-testid="text-load-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {loadError}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RangoliLoader size={48} />
        </div>
      )}

      {!loading && searched && !loadError && records.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground" data-testid="text-no-records">
          No records found for the given filters.
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Mobile</th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => {
                const ref = getField(rec, "referenceNo", "paymentRef", "orderId", "orderID", "order_id", "txnId");
                return (
                  <tr key={ref !== "—" ? ref : idx} className="border-b border-border/30 last:border-0" data-testid={`row-correction-${ref !== "—" ? ref : idx}`}>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getField(rec, "type", "recordType", "category", "serviceType")}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{ref}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getField(rec, "payeeName", "name", "devoteeName", "donorName", "customerName")}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getField(rec, "mobile", "mobileNumber", "phone")}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      ₹{getField(rec, "txnAmount", "amount", "totalAmount")}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getField(rec, "addedAt", "txnDate", "date", "bookingDate", "donationDate", "createdAt")}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {getField(rec, "status", "txnStatus", "paymentStatus", "state")}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          const currentBookingDate = getField(rec, "bookingDate", "reservedDate") !== "—" ? getField(rec, "bookingDate", "reservedDate") : "";
                          setDetailRecord(rec);
                          setDetailRecordType(lastSearchedRecordType);
                          setOriginalBookingDate(currentBookingDate);
                          setEditBookingDate(currentBookingDate);
                          setEditRemarks("");
                          setSaveError(null);
                        }}
                        className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
                        data-testid={`button-edit-${ref !== "—" ? ref : idx}`}
                      >
                        <PencilLine className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detailRecord} onOpenChange={(open) => !open && closeDetailDialog()}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-record-detail">
          <DialogHeader>
            <DialogTitle>Full Record Details</DialogTitle>
            <DialogDescription>
              {detailRecordType === "yatri"
                ? "Review the record below, then update the booking date or add a remark to correct it."
                : "All fields returned by the Sringeri API for this record. Editing isn't supported for this record type yet."}
            </DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {Object.entries(detailRecord).map(([key, value]) => (
                    <tr key={key} className="border-b border-border/30 last:border-0" data-testid={`row-detail-field-${key}`}>
                      <td className="py-2 pr-4 align-top font-medium text-muted-foreground whitespace-nowrap">{key}</td>
                      <td className="py-2 break-all">
                        {value === null || value === undefined || value === ""
                          ? "—"
                          : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {detailRecordType === "yatri" && (
                <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Booking Date</label>
                    <input
                      type="date"
                      value={editBookingDate}
                      onChange={(e) => setEditBookingDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-edit-booking-date"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Add a Remark</label>
                    <input
                      type="text"
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      placeholder="Describe the correction being made"
                      className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-edit-remarks"
                    />
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      This is appended to existing remarks along with your admin identity — it doesn't replace them.
                    </p>
                  </div>

                  {saveError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700" data-testid="text-save-error">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {saveError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={closeDetailDialog}
                      disabled={saving}
                      data-testid="button-cancel-correction"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveCorrection}
                      disabled={saving}
                      data-testid="button-save-correction"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
