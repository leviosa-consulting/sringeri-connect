import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

interface Rashi {
  id: number;
  name: string;
}

interface Nakshatra {
  id: number;
  name: string;
  rashiIds?: string;
}

interface PostageOption {
  id: number;
  name: string;
  amount: number;
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
  const [originalIsPrinted, setOriginalIsPrinted] = useState("");
  const [editIsPrinted, setEditIsPrinted] = useState(false);
  const [originalMobileNumber, setOriginalMobileNumber] = useState("");
  const [editMobileNumber, setEditMobileNumber] = useState("");
  const [originalDevoteeName, setOriginalDevoteeName] = useState("");
  const [editDevoteeName, setEditDevoteeName] = useState("");
  const [originalDevoteeNameK, setOriginalDevoteeNameK] = useState("");
  const [editDevoteeNameK, setEditDevoteeNameK] = useState("");
  const [originalInAbsentia, setOriginalInAbsentia] = useState("");
  const [editInAbsentia, setEditInAbsentia] = useState(false);
  const [originalPrasadaNeeded, setOriginalPrasadaNeeded] = useState("");
  const [editPrasadaNeeded, setEditPrasadaNeeded] = useState(false);
  const [originalAddresseeName, setOriginalAddresseeName] = useState("");
  const [editAddresseeName, setEditAddresseeName] = useState("");
  const [originalAddressLine1, setOriginalAddressLine1] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [originalAddressLine2, setOriginalAddressLine2] = useState("");
  const [editAddressLine2, setEditAddressLine2] = useState("");
  const [originalLandmark, setOriginalLandmark] = useState("");
  const [editLandmark, setEditLandmark] = useState("");
  const [originalCity, setOriginalCity] = useState("");
  const [editCity, setEditCity] = useState("");
  const [originalState, setOriginalState] = useState("");
  const [editState, setEditState] = useState("");
  const [originalCountry, setOriginalCountry] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [originalPincode, setOriginalPincode] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [originalGotra, setOriginalGotra] = useState("");
  const [editGotra, setEditGotra] = useState("");
  const [originalGotraK, setOriginalGotraK] = useState("");
  const [editGotraK, setEditGotraK] = useState("");
  const [originalNakshatraId, setOriginalNakshatraId] = useState("");
  const [editNakshatraId, setEditNakshatraId] = useState("");
  const [originalRashiId, setOriginalRashiId] = useState("");
  const [editRashiId, setEditRashiId] = useState("");
  const [originalPostageId, setOriginalPostageId] = useState("");
  const [editPostageId, setEditPostageId] = useState("");
  const [originalSevaDate, setOriginalSevaDate] = useState("");
  const [editSevaDate, setEditSevaDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: rashis = [] } = useQuery<Rashi[]>({
    queryKey: ["rashis"],
    queryFn: async () => {
      const res = await fetch("/api/rashis");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: nakshatras = [] } = useQuery<Nakshatra[]>({
    queryKey: ["nakshatras"],
    queryFn: async () => {
      const res = await fetch("/api/nakshatras");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: postageOptions = [] } = useQuery<PostageOption[]>({
    queryKey: ["sevaPostageOptions"],
    queryFn: async () => {
      const res = await fetch("/api/postageOptions");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: deitySevaLookup = {} } = useQuery<
    Record<string, { deityName: string; sevaName: string; sannidhiName: string }>
  >({
    queryKey: ["deitySevaLookup"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deitySevaLookup");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!detailRecord && detailRecordType === "seva",
    staleTime: 5 * 60 * 1000,
  });

  const handleEditNakshatraChange = (idStr: string) => {
    setEditNakshatraId(idStr);
    if (!idStr) return;
    const nak = nakshatras.find((n) => String(n.id) === idStr);
    if (nak && nak.rashiIds) {
      const allowedIds = nak.rashiIds.split(",").map((s) => s.trim());
      if (!allowedIds.includes(editRashiId)) {
        setEditRashiId(allowedIds[0] || "");
      }
    }
  };

  const filteredEditRashis = useMemo(() => {
    if (!editNakshatraId) return rashis;
    const nak = nakshatras.find((n) => String(n.id) === editNakshatraId);
    if (!nak || !nak.rashiIds) return rashis;
    const allowedIds = nak.rashiIds.split(",").map((s) => s.trim());
    return rashis.filter((r) => allowedIds.includes(String(r.id)));
  }, [editNakshatraId, nakshatras, rashis]);

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
    setOriginalIsPrinted("");
    setEditIsPrinted(false);
    setOriginalMobileNumber("");
    setEditMobileNumber("");
    setOriginalDevoteeName("");
    setEditDevoteeName("");
    setOriginalDevoteeNameK("");
    setEditDevoteeNameK("");
    setOriginalInAbsentia("");
    setEditInAbsentia(false);
    setOriginalPrasadaNeeded("");
    setEditPrasadaNeeded(false);
    setOriginalAddresseeName("");
    setEditAddresseeName("");
    setOriginalAddressLine1("");
    setEditAddressLine1("");
    setOriginalAddressLine2("");
    setEditAddressLine2("");
    setOriginalLandmark("");
    setEditLandmark("");
    setOriginalCity("");
    setEditCity("");
    setOriginalState("");
    setEditState("");
    setOriginalCountry("");
    setEditCountry("");
    setOriginalPincode("");
    setEditPincode("");
    setOriginalGotra("");
    setEditGotra("");
    setOriginalGotraK("");
    setEditGotraK("");
    setOriginalNakshatraId("");
    setEditNakshatraId("");
    setOriginalRashiId("");
    setEditRashiId("");
    setOriginalPostageId("");
    setEditPostageId("");
    setOriginalSevaDate("");
    setEditSevaDate("");
    setSaveError(null);
  }

  async function handleSaveCorrection() {
    if (!detailRecord || !getToken) return;
    if (detailRecordType !== "yatri" && detailRecordType !== "fastline" && detailRecordType !== "seva") {
      setSaveError("Editing is not yet supported for this record type.");
      return;
    }
    const recordId = getField(detailRecord, "id", "reservationId", "ID");
    if (recordId === "—") {
      setSaveError("Could not determine this record's ID.");
      return;
    }

    const trimmedBookingDate = editBookingDate.trim();
    const hasBookingDateChange =
      detailRecordType === "yatri" &&
      trimmedBookingDate !== "" &&
      trimmedBookingDate !== originalBookingDate.trim();

    const trimmedMobileNumber = editMobileNumber.trim();
    const hasMobileNumberChange =
      detailRecordType === "fastline" &&
      trimmedMobileNumber !== "" &&
      trimmedMobileNumber !== originalMobileNumber.trim();

    const trimmedDevoteeName = editDevoteeName.trim();
    const hasDevoteeNameChange =
      (detailRecordType === "fastline" || detailRecordType === "seva") &&
      trimmedDevoteeName !== "" &&
      trimmedDevoteeName !== originalDevoteeName.trim();

    const trimmedDevoteeNameK = editDevoteeNameK.trim();
    const hasDevoteeNameKChange =
      (detailRecordType === "fastline" || detailRecordType === "seva") &&
      trimmedDevoteeNameK !== "" &&
      trimmedDevoteeNameK !== originalDevoteeNameK.trim();

    const newIsPrinted = editIsPrinted ? "1" : "0";
    const hasIsPrintedChange =
      (detailRecordType === "fastline" || detailRecordType === "seva") && newIsPrinted !== originalIsPrinted;

    const newInAbsentia = editInAbsentia ? "1" : "0";
    const hasInAbsentiaChange = detailRecordType === "seva" && newInAbsentia !== originalInAbsentia;

    const newPrasadaNeeded = editPrasadaNeeded ? "1" : "0";
    const hasPrasadaNeededChange = detailRecordType === "seva" && newPrasadaNeeded !== originalPrasadaNeeded;

    const trimmedAddresseeName = editAddresseeName.trim();
    const hasAddresseeNameChange =
      detailRecordType === "seva" && trimmedAddresseeName !== "" && trimmedAddresseeName !== originalAddresseeName.trim();

    const trimmedAddressLine1 = editAddressLine1.trim();
    const hasAddressLine1Change =
      detailRecordType === "seva" && trimmedAddressLine1 !== "" && trimmedAddressLine1 !== originalAddressLine1.trim();

    const trimmedAddressLine2 = editAddressLine2.trim();
    const hasAddressLine2Change =
      detailRecordType === "seva" && trimmedAddressLine2 !== "" && trimmedAddressLine2 !== originalAddressLine2.trim();

    const trimmedLandmark = editLandmark.trim();
    const hasLandmarkChange =
      detailRecordType === "seva" && trimmedLandmark !== "" && trimmedLandmark !== originalLandmark.trim();

    const trimmedCity = editCity.trim();
    const hasCityChange = detailRecordType === "seva" && trimmedCity !== "" && trimmedCity !== originalCity.trim();

    const trimmedState = editState.trim();
    const hasStateChange = detailRecordType === "seva" && trimmedState !== "" && trimmedState !== originalState.trim();

    const trimmedCountry = editCountry.trim();
    const hasCountryChange =
      detailRecordType === "seva" && trimmedCountry !== "" && trimmedCountry !== originalCountry.trim();

    const trimmedPincode = editPincode.trim();
    const hasPincodeChange =
      detailRecordType === "seva" && trimmedPincode !== "" && trimmedPincode !== originalPincode.trim();

    const trimmedGotra = editGotra.trim();
    const hasGotraChange = detailRecordType === "seva" && trimmedGotra !== "" && trimmedGotra !== originalGotra.trim();

    const trimmedGotraK = editGotraK.trim();
    const hasGotraKChange =
      detailRecordType === "seva" && trimmedGotraK !== "" && trimmedGotraK !== originalGotraK.trim();

    const trimmedSevaDate = editSevaDate.trim();
    const hasSevaDateChange =
      detailRecordType === "seva" && trimmedSevaDate !== "" && trimmedSevaDate !== originalSevaDate.trim();

    const hasNakshatraIdChange =
      detailRecordType === "seva" && editNakshatraId !== "" && editNakshatraId !== originalNakshatraId;

    const hasRashiIdChange = detailRecordType === "seva" && editRashiId !== "" && editRashiId !== originalRashiId;

    const hasPostageIdChange =
      detailRecordType === "seva" && editPostageId !== "" && editPostageId !== originalPostageId;

    const hasRemarksChange = editRemarks.trim() !== "";

    const hasAnyChange =
      hasBookingDateChange ||
      hasMobileNumberChange ||
      hasDevoteeNameChange ||
      hasDevoteeNameKChange ||
      hasIsPrintedChange ||
      hasInAbsentiaChange ||
      hasPrasadaNeededChange ||
      hasAddresseeNameChange ||
      hasAddressLine1Change ||
      hasAddressLine2Change ||
      hasLandmarkChange ||
      hasCityChange ||
      hasStateChange ||
      hasCountryChange ||
      hasPincodeChange ||
      hasGotraChange ||
      hasGotraKChange ||
      hasSevaDateChange ||
      hasNakshatraIdChange ||
      hasRashiIdChange ||
      hasPostageIdChange ||
      hasRemarksChange;
    if (!hasAnyChange) {
      setSaveError("Change at least one field or add a remark before saving.");
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
          ...(hasMobileNumberChange
            ? { mobileNumber: trimmedMobileNumber, originalMobileNumber: originalMobileNumber.trim() }
            : {}),
          ...(hasDevoteeNameChange
            ? { devoteeName: trimmedDevoteeName, originalDevoteeName: originalDevoteeName.trim() }
            : {}),
          ...(hasDevoteeNameKChange
            ? { devoteeNameK: trimmedDevoteeNameK, originalDevoteeNameK: originalDevoteeNameK.trim() }
            : {}),
          ...(hasIsPrintedChange ? { isPrinted: newIsPrinted, originalIsPrinted } : {}),
          ...(hasInAbsentiaChange ? { inAbsentia: newInAbsentia, originalInAbsentia } : {}),
          ...(hasPrasadaNeededChange ? { prasadaNeeded: newPrasadaNeeded, originalPrasadaNeeded } : {}),
          ...(hasAddresseeNameChange
            ? { addresseeName: trimmedAddresseeName, originalAddresseeName: originalAddresseeName.trim() }
            : {}),
          ...(hasAddressLine1Change
            ? { addressLine1: trimmedAddressLine1, originalAddressLine1: originalAddressLine1.trim() }
            : {}),
          ...(hasAddressLine2Change
            ? { addressLine2: trimmedAddressLine2, originalAddressLine2: originalAddressLine2.trim() }
            : {}),
          ...(hasLandmarkChange ? { landmark: trimmedLandmark, originalLandmark: originalLandmark.trim() } : {}),
          ...(hasCityChange ? { city: trimmedCity, originalCity: originalCity.trim() } : {}),
          ...(hasStateChange ? { state: trimmedState, originalState: originalState.trim() } : {}),
          ...(hasCountryChange ? { country: trimmedCountry, originalCountry: originalCountry.trim() } : {}),
          ...(hasPincodeChange ? { pincode: trimmedPincode, originalPincode: originalPincode.trim() } : {}),
          ...(hasGotraChange ? { gotra: trimmedGotra, originalGotra: originalGotra.trim() } : {}),
          ...(hasGotraKChange ? { gotraK: trimmedGotraK, originalGotraK: originalGotraK.trim() } : {}),
          ...(hasSevaDateChange ? { sevaDate: trimmedSevaDate, originalSevaDate: originalSevaDate.trim() } : {}),
          ...(hasNakshatraIdChange ? { nakshatraId: editNakshatraId, originalNakshatraId } : {}),
          ...(hasRashiIdChange ? { rashiId: editRashiId, originalRashiId } : {}),
          ...(hasPostageIdChange ? { postageId: editPostageId, originalPostageId } : {}),
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
      if (hasMobileNumberChange) {
        if ("mobileNumber" in updatedRecord) updatedRecord.mobileNumber = trimmedMobileNumber;
        if ("mobile" in updatedRecord) updatedRecord.mobile = trimmedMobileNumber;
        if (!("mobileNumber" in updatedRecord) && !("mobile" in updatedRecord)) {
          updatedRecord.mobileNumber = trimmedMobileNumber;
        }
      }
      if (hasDevoteeNameChange) {
        updatedRecord.devoteeName = trimmedDevoteeName;
      }
      if (hasDevoteeNameKChange) {
        updatedRecord.devoteeNameK = trimmedDevoteeNameK;
      }
      if (hasIsPrintedChange) {
        updatedRecord.isPrinted = newIsPrinted;
      }
      if (hasInAbsentiaChange) {
        updatedRecord.inAbsentia = newInAbsentia;
      }
      if (hasPrasadaNeededChange) {
        updatedRecord.prasadaNeeded = newPrasadaNeeded;
      }
      if (hasAddresseeNameChange) {
        updatedRecord.addresseeName = trimmedAddresseeName;
      }
      if (hasAddressLine1Change) {
        updatedRecord.addressLine1 = trimmedAddressLine1;
      }
      if (hasAddressLine2Change) {
        updatedRecord.addressLine2 = trimmedAddressLine2;
      }
      if (hasLandmarkChange) {
        updatedRecord.landmark = trimmedLandmark;
      }
      if (hasCityChange) {
        updatedRecord.city = trimmedCity;
      }
      if (hasStateChange) {
        updatedRecord.state = trimmedState;
      }
      if (hasCountryChange) {
        updatedRecord.country = trimmedCountry;
      }
      if (hasPincodeChange) {
        updatedRecord.pincode = trimmedPincode;
      }
      if (hasGotraChange) {
        updatedRecord.gotra = trimmedGotra;
      }
      if (hasGotraKChange) {
        updatedRecord.gotraK = trimmedGotraK;
      }
      if (hasSevaDateChange) {
        updatedRecord.sevaDate = trimmedSevaDate;
      }
      if (hasNakshatraIdChange) {
        updatedRecord.nakshatraId = editNakshatraId;
      }
      if (hasRashiIdChange) {
        updatedRecord.rashiId = editRashiId;
      }
      if (hasPostageIdChange) {
        updatedRecord.postageId = editPostageId;
      }

      const adminIdentity = user?.email || "you";
      const summaryParts: string[] = [];
      if (hasBookingDateChange) {
        summaryParts.push(`Booking date changed from ${originalBookingDate.trim() || "unknown"} to ${trimmedBookingDate}`);
      }
      if (hasIsPrintedChange) {
        summaryParts.push(`Printed status changed from ${originalIsPrinted || "unknown"} to ${newIsPrinted}`);
      }
      if (hasMobileNumberChange) {
        summaryParts.push(`Mobile number changed from ${originalMobileNumber.trim() || "unknown"} to ${trimmedMobileNumber}`);
      }
      if (hasDevoteeNameChange) {
        summaryParts.push(`Devotee name changed from ${originalDevoteeName.trim() || "unknown"} to ${trimmedDevoteeName}`);
      }
      if (hasDevoteeNameKChange) {
        summaryParts.push(
          `Devotee name (Kannada) changed from ${originalDevoteeNameK.trim() || "unknown"} to ${trimmedDevoteeNameK}`
        );
      }
      if (hasInAbsentiaChange) {
        summaryParts.push(`In-absentia status changed from ${originalInAbsentia || "unknown"} to ${newInAbsentia}`);
      }
      if (hasPrasadaNeededChange) {
        summaryParts.push(`Prasada needed status changed from ${originalPrasadaNeeded || "unknown"} to ${newPrasadaNeeded}`);
      }
      if (hasAddresseeNameChange) {
        summaryParts.push(
          `Addressee name changed from ${originalAddresseeName.trim() || "unknown"} to ${trimmedAddresseeName}`
        );
      }
      if (hasAddressLine1Change) {
        summaryParts.push(
          `Address line 1 changed from ${originalAddressLine1.trim() || "unknown"} to ${trimmedAddressLine1}`
        );
      }
      if (hasAddressLine2Change) {
        summaryParts.push(
          `Address line 2 changed from ${originalAddressLine2.trim() || "unknown"} to ${trimmedAddressLine2}`
        );
      }
      if (hasLandmarkChange) {
        summaryParts.push(`Landmark changed from ${originalLandmark.trim() || "unknown"} to ${trimmedLandmark}`);
      }
      if (hasCityChange) {
        summaryParts.push(`City changed from ${originalCity.trim() || "unknown"} to ${trimmedCity}`);
      }
      if (hasStateChange) {
        summaryParts.push(`State changed from ${originalState.trim() || "unknown"} to ${trimmedState}`);
      }
      if (hasCountryChange) {
        summaryParts.push(`Country changed from ${originalCountry.trim() || "unknown"} to ${trimmedCountry}`);
      }
      if (hasPincodeChange) {
        summaryParts.push(`Pincode changed from ${originalPincode.trim() || "unknown"} to ${trimmedPincode}`);
      }
      if (hasGotraChange) {
        summaryParts.push(`Gotra changed from ${originalGotra.trim() || "unknown"} to ${trimmedGotra}`);
      }
      if (hasGotraKChange) {
        summaryParts.push(`Gotra (Kannada) changed from ${originalGotraK.trim() || "unknown"} to ${trimmedGotraK}`);
      }
      if (hasSevaDateChange) {
        summaryParts.push(`Seva date changed from ${originalSevaDate.trim() || "unknown"} to ${trimmedSevaDate}`);
      }
      if (hasNakshatraIdChange) {
        const fromName = nakshatras.find((n) => String(n.id) === originalNakshatraId)?.name || originalNakshatraId || "unknown";
        const toName = nakshatras.find((n) => String(n.id) === editNakshatraId)?.name || editNakshatraId;
        summaryParts.push(`Nakshatra changed from ${fromName} to ${toName}`);
      }
      if (hasRashiIdChange) {
        const fromName = rashis.find((r) => String(r.id) === originalRashiId)?.name || originalRashiId || "unknown";
        const toName = rashis.find((r) => String(r.id) === editRashiId)?.name || editRashiId;
        summaryParts.push(`Rashi changed from ${fromName} to ${toName}`);
      }
      if (hasPostageIdChange) {
        const fromName =
          postageOptions.find((p) => String(p.id) === originalPostageId)?.name || originalPostageId || "unknown";
        const toName = postageOptions.find((p) => String(p.id) === editPostageId)?.name || editPostageId;
        summaryParts.push(`Postage option changed from ${fromName} to ${toName}`);
      }
      if (hasRemarksChange) {
        summaryParts.push(editRemarks.trim());
      }
      const existingRemarksField = detailRecordType === "fastline" ? "donationDetails" : "remarks";
      const existingRemarks = getField(detailRecord, existingRemarksField, "remarks");
      const appendedRemark = `${summaryParts.join(" | ")} - ${adminIdentity}`;
      const newRemarksValue = existingRemarks !== "—" ? `${existingRemarks}|${appendedRemark}` : appendedRemark;
      updatedRecord[existingRemarksField] = newRemarksValue;
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
                          const currentMobileNumber = getField(rec, "mobileNumber", "mobile") !== "—" ? getField(rec, "mobileNumber", "mobile") : "";
                          const currentDevoteeName = getField(rec, "devoteeName") !== "—" ? getField(rec, "devoteeName") : "";
                          const currentDevoteeNameK = getField(rec, "devoteeNameK") !== "—" ? getField(rec, "devoteeNameK") : "";
                          const currentIsPrintedRaw = getField(rec, "isPrinted");
                          const currentIsPrinted = currentIsPrintedRaw !== "—" ? currentIsPrintedRaw : "0";
                          const currentInAbsentiaRaw = getField(rec, "inAbsentia");
                          const currentInAbsentia = currentInAbsentiaRaw !== "—" ? currentInAbsentiaRaw : "0";
                          const currentPrasadaNeededRaw = getField(rec, "prasadaNeeded");
                          const currentPrasadaNeeded = currentPrasadaNeededRaw !== "—" ? currentPrasadaNeededRaw : "0";
                          const currentAddresseeName = getField(rec, "addresseeName") !== "—" ? getField(rec, "addresseeName") : "";
                          const currentAddressLine1 = getField(rec, "addressLine1") !== "—" ? getField(rec, "addressLine1") : "";
                          const currentAddressLine2 = getField(rec, "addressLine2") !== "—" ? getField(rec, "addressLine2") : "";
                          const currentLandmark = getField(rec, "landmark") !== "—" ? getField(rec, "landmark") : "";
                          const currentCity = getField(rec, "city") !== "—" ? getField(rec, "city") : "";
                          const currentState = getField(rec, "state") !== "—" ? getField(rec, "state") : "";
                          const currentCountry = getField(rec, "country") !== "—" ? getField(rec, "country") : "";
                          const currentPincode = getField(rec, "pincode") !== "—" ? getField(rec, "pincode") : "";
                          const currentGotra = getField(rec, "gotra") !== "—" ? getField(rec, "gotra") : "";
                          const currentGotraK = getField(rec, "gotraK") !== "—" ? getField(rec, "gotraK") : "";
                          const currentNakshatraId = getField(rec, "nakshatraId") !== "—" ? getField(rec, "nakshatraId") : "";
                          const currentRashiId = getField(rec, "rashiId") !== "—" ? getField(rec, "rashiId") : "";
                          const currentPostageId = getField(rec, "postageId") !== "—" ? getField(rec, "postageId") : "";
                          const currentSevaDate = getField(rec, "sevaDate") !== "—" ? getField(rec, "sevaDate") : "";
                          setDetailRecord(rec);
                          setDetailRecordType(lastSearchedRecordType);
                          setOriginalBookingDate(currentBookingDate);
                          setEditBookingDate(currentBookingDate);
                          setEditRemarks("");
                          setOriginalMobileNumber(currentMobileNumber);
                          setEditMobileNumber(currentMobileNumber);
                          setOriginalDevoteeName(currentDevoteeName);
                          setEditDevoteeName(currentDevoteeName);
                          setOriginalDevoteeNameK(currentDevoteeNameK);
                          setEditDevoteeNameK(currentDevoteeNameK);
                          setOriginalIsPrinted(currentIsPrinted);
                          setEditIsPrinted(currentIsPrinted === "1");
                          setOriginalInAbsentia(currentInAbsentia);
                          setEditInAbsentia(currentInAbsentia === "1");
                          setOriginalPrasadaNeeded(currentPrasadaNeeded);
                          setEditPrasadaNeeded(currentPrasadaNeeded === "1");
                          setOriginalAddresseeName(currentAddresseeName);
                          setEditAddresseeName(currentAddresseeName);
                          setOriginalAddressLine1(currentAddressLine1);
                          setEditAddressLine1(currentAddressLine1);
                          setOriginalAddressLine2(currentAddressLine2);
                          setEditAddressLine2(currentAddressLine2);
                          setOriginalLandmark(currentLandmark);
                          setEditLandmark(currentLandmark);
                          setOriginalCity(currentCity);
                          setEditCity(currentCity);
                          setOriginalState(currentState);
                          setEditState(currentState);
                          setOriginalCountry(currentCountry);
                          setEditCountry(currentCountry);
                          setOriginalPincode(currentPincode);
                          setEditPincode(currentPincode);
                          setOriginalGotra(currentGotra);
                          setEditGotra(currentGotra);
                          setOriginalGotraK(currentGotraK);
                          setEditGotraK(currentGotraK);
                          setOriginalNakshatraId(currentNakshatraId);
                          setEditNakshatraId(currentNakshatraId);
                          setOriginalRashiId(currentRashiId);
                          setEditRashiId(currentRashiId);
                          setOriginalPostageId(currentPostageId);
                          setEditPostageId(currentPostageId);
                          setOriginalSevaDate(currentSevaDate);
                          setEditSevaDate(currentSevaDate);
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
                : detailRecordType === "fastline" || detailRecordType === "seva"
                  ? "Review the record below, then update the fields or add a remark to correct it."
                  : "All fields returned by the Sringeri API for this record. Editing isn't supported for this record type yet."}
            </DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {Object.entries(detailRecord).map(([key, value]) => {
                    const resolvedDeitySeva =
                      detailRecordType === "seva" && key === "deitySevaId" && value !== null && value !== undefined && value !== ""
                        ? deitySevaLookup[String(value)]
                        : undefined;
                    return (
                      <tr key={key} className="border-b border-border/30 last:border-0" data-testid={`row-detail-field-${key}`}>
                        <td className="py-2 pr-4 align-top font-medium text-muted-foreground whitespace-nowrap">{key}</td>
                        <td className="py-2 break-all">
                          {value === null || value === undefined || value === ""
                            ? "—"
                            : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          {resolvedDeitySeva && (
                            <span
                              className="block text-xs text-muted-foreground mt-0.5"
                              data-testid="text-deity-seva-name"
                            >
                              {resolvedDeitySeva.deityName} — {resolvedDeitySeva.sevaName}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(detailRecordType === "yatri" || detailRecordType === "fastline" || detailRecordType === "seva") && (
                <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                  {detailRecordType === "yatri" && (
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
                  )}
                  {detailRecordType === "fastline" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Mobile Number</label>
                        <input
                          type="tel"
                          value={editMobileNumber}
                          onChange={(e) => setEditMobileNumber(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-mobile-number"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Devotee Name</label>
                        <input
                          type="text"
                          value={editDevoteeName}
                          onChange={(e) => setEditDevoteeName(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-devotee-name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Devotee Name (Kannada)</label>
                        <input
                          type="text"
                          value={editDevoteeNameK}
                          onChange={(e) => setEditDevoteeNameK(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-devotee-name-k"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-is-printed"
                          checked={editIsPrinted}
                          onChange={(e) => setEditIsPrinted(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                          data-testid="checkbox-edit-is-printed"
                        />
                        <label htmlFor="edit-is-printed" className="text-xs font-medium text-muted-foreground">
                          Receipt Printed
                        </label>
                      </div>
                    </>
                  )}
                  {detailRecordType === "seva" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Devotee Name</label>
                        <input
                          type="text"
                          value={editDevoteeName}
                          onChange={(e) => setEditDevoteeName(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-devotee-name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Devotee Name (Kannada)</label>
                        <input
                          type="text"
                          value={editDevoteeNameK}
                          onChange={(e) => setEditDevoteeNameK(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-devotee-name-k"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Gotra</label>
                        <input
                          type="text"
                          value={editGotra}
                          onChange={(e) => setEditGotra(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-gotra"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Gotra (Kannada)</label>
                        <input
                          type="text"
                          value={editGotraK}
                          onChange={(e) => setEditGotraK(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-gotra-k"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nakshatra</label>
                        <select
                          value={editNakshatraId}
                          onChange={(e) => handleEditNakshatraChange(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                          data-testid="select-edit-nakshatra"
                        >
                          <option value="">— Select Nakshatra —</option>
                          {nakshatras.map((n) => (
                            <option key={n.id} value={String(n.id)}>
                              {n.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Rashi</label>
                        <select
                          value={editRashiId}
                          onChange={(e) => setEditRashiId(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                          data-testid="select-edit-rashi"
                        >
                          <option value="">— Select Rashi —</option>
                          {filteredEditRashis.map((r) => (
                            <option key={r.id} value={String(r.id)}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Seva Date</label>
                        <input
                          type="date"
                          value={editSevaDate}
                          onChange={(e) => setEditSevaDate(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-seva-date"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Addressee Name</label>
                        <input
                          type="text"
                          value={editAddresseeName}
                          onChange={(e) => setEditAddresseeName(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-addressee-name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Address Line 1</label>
                        <input
                          type="text"
                          value={editAddressLine1}
                          onChange={(e) => setEditAddressLine1(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-address-line-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Address Line 2</label>
                        <input
                          type="text"
                          value={editAddressLine2}
                          onChange={(e) => setEditAddressLine2(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-address-line-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Landmark</label>
                        <input
                          type="text"
                          value={editLandmark}
                          onChange={(e) => setEditLandmark(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-landmark"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-city"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
                        <input
                          type="text"
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-state"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Country</label>
                        <input
                          type="text"
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-country"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Pincode</label>
                        <input
                          type="text"
                          value={editPincode}
                          onChange={(e) => setEditPincode(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid="input-edit-pincode"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Postage Option</label>
                        <select
                          value={editPostageId}
                          onChange={(e) => setEditPostageId(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                          data-testid="select-edit-postage"
                        >
                          <option value="">— Select Postage Option —</option>
                          {postageOptions.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-is-printed"
                          checked={editIsPrinted}
                          onChange={(e) => setEditIsPrinted(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                          data-testid="checkbox-edit-is-printed"
                        />
                        <label htmlFor="edit-is-printed" className="text-xs font-medium text-muted-foreground">
                          Receipt Printed
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-in-absentia"
                          checked={editInAbsentia}
                          onChange={(e) => setEditInAbsentia(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                          data-testid="checkbox-edit-in-absentia"
                        />
                        <label htmlFor="edit-in-absentia" className="text-xs font-medium text-muted-foreground">
                          In Absentia
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-prasada-needed"
                          checked={editPrasadaNeeded}
                          onChange={(e) => setEditPrasadaNeeded(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                          data-testid="checkbox-edit-prasada-needed"
                        />
                        <label htmlFor="edit-prasada-needed" className="text-xs font-medium text-muted-foreground">
                          Prasada Needed
                        </label>
                      </div>
                    </>
                  )}
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
