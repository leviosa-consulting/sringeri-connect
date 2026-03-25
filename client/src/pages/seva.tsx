import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookCopy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  ShoppingCart,
  Trash2,
  X,
  Calendar,
  Clock,
  Repeat,
  Search,
  MapPin,
  User,
  Mail,
  Phone,
  Star,
  Zap,
  CalendarDays,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface SevaType {
  id: number;
  short: string;
  name: string;
  description: string;
  hasCart: boolean;
}

interface Sannidhi {
  id: number;
  name: string;
}

interface DeitySeva {
  id: number;
  name: string;
  price: number;
  postageCharges?: number;
  receiptTypeId?: number;
  branchId?: number;
}

interface SevaAvailabilityDate {
  date: string;
  dispDate: string;
  available: number;
}

interface CalendarMonth {
  name: string;
  days: CalendarDay[];
}

interface CalendarDay {
  date: number | string;
  dbDate: string;
  dispDate: string;
  disabled: boolean;
  available: number;
  selected: boolean;
}

interface PostageOption {
  id: number;
  name: string;
  amount: number;
}

interface RecurrenceType {
  id: number;
  name: string;
}

interface Rashi {
  id: number;
  name: string;
}

interface FrequentSeva {
  dsId: number;
  deityId: number;
  deityName: string;
  sevaName: string;
  price: number;
  orderId?: number;
  sannidhiName?: string;
}

interface CartSeva {
  sannidhiId: number;
  sannidhiName: string;
  dsId: number;
  deitySevaName: string;
  sevaDate: string;
  inAbsentia: number;
  receivePrasadam: string;
  postageCharges: number;
  postageId: string;
  amount: number;
  totalAmount: number;
  name: string;
  nameK: string;
  nakshatraId: string;
  rashiId: string;
  gotra: string;
  gotraK: string;
  city: string;
  kannadaName: string;
  kannadaCity: string;
  receiptTypeId: number;
  branchId: number;
  calendarType: number | string;
  type: number | string;
  fromDate: string;
  toDate: string;
  noEnd: boolean;
  weekdayId: number | string;
  weekdayRepeatId: number | string;
  specificDate: number | string;
  monthId: number | string;
  fromChandraMasaId: number | string;
  fromNakshatraId: number | string;
  fromTithiId: number | string;
  fromSouraMasaId: number | string;
  remarks: string;
  mode: number;
  sevaCount?: number;
  addresseeName?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  country?: string;
  pincode?: string;
  state?: string;
  addresseePlace?: string;
}

const SEVA_TYPES: SevaType[] = [
  {
    id: 1,
    short: "fl",
    name: "Today",
    description: "",
    hasCart: false,
  },
  {
    id: 2,
    short: "otfs",
    name: "Future Date (One Time)",
    description: "",
    hasCart: true,
  },
  {
    id: 3,
    short: "ps",
    name: "Recurring (Puduvattu)",
    description: "",
    hasCart: true,
  },
];

const SEVA_CENTRES = [
  { id: 1, name: "Sringeri" },
  { id: 2, name: "Bengaluru" },
  { id: 3, name: "Coimbatore" },
  { id: 4, name: "Gurugram" },
];

const WEEKDAYS = [
  { id: 1, name: "Sunday" },
  { id: 2, name: "Monday" },
  { id: 3, name: "Tuesday" },
  { id: 4, name: "Wednesday" },
  { id: 5, name: "Thursday" },
  { id: 6, name: "Friday" },
  { id: 7, name: "Saturday" },
];

const WEEKDAY_REPEATS = [
  { id: 1, name: "Every" },
  { id: 2, name: "1st" },
  { id: 3, name: "2nd" },
  { id: 4, name: "3rd" },
  { id: 5, name: "4th" },
  { id: 6, name: "Last" },
];

function formatNumber(value: number): string {
  return value ? value.toLocaleString("en-IN") : "0";
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  const dayMonth = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return `${dayMonth}, ${year}`;
}

export default function Seva() {
  const { user, devoteeData } = useAuth();
  const [, navigate] = useLocation();

  const [selectedSevaType, setSelectedSevaType] = useState<SevaType | null>(null);
  const [step, setStep] = useState<"home" | "select" | "karta" | "address" | "review" | "payee">("home");

  const [selectedSannidhi, setSelectedSannidhi] = useState<Sannidhi | null>(null);
  const [selectedSeva, setSelectedSeva] = useState<DeitySeva | null>(null);
  const [sannidhiSearch, setSannidhiSearch] = useState("");
  const [sevaSearch, setSevaSearch] = useState("");
  const [selectedCentre, setSelectedCentre] = useState<{ id: number; name: string } | null>(null);
  const [activeCalendarMonthIdx, setActiveCalendarMonthIdx] = useState(0);
  const [upcomingSevasOpen, setUpcomingSevasOpen] = useState(false);
  const [showSannidhiDropdown, setShowSannidhiDropdown] = useState(false);
  const [showSevaDropdown, setShowSevaDropdown] = useState(false);
  const [showFastlineConfirm, setShowFastlineConfirm] = useState(false);
  const [pendingFrequentSevaId, setPendingFrequentSevaId] = useState<number | null>(null);

  const [sevaDate, setSevaDate] = useState("");
  const [inAbsentia, setInAbsentia] = useState<string>("");
  const [receivePrasadam, setReceivePrasadam] = useState<string>("");
  const [postageId, setPostageId] = useState("");
  const [postageCharges, setPostageCharges] = useState(0);
  const [hideCalendarPostage, setHideCalendarPostage] = useState(false);

  const [kartaName, setKartaName] = useState("");
  const [kartaNakshatraId, setKartaNakshatraId] = useState("");
  const [kartaRashiId, setKartaRashiId] = useState("");
  const [kartaGotra, setKartaGotra] = useState("");
  const [kartaGotraK, setKartaGotraK] = useState("");
  const [kartaCity, setKartaCity] = useState("");
  const [showKartaList, setShowKartaList] = useState(false);

  const [fromDate, setFromDate] = useState(getTomorrowDate());
  const [toDate, setToDate] = useState("");
  const [noEnd, setNoEnd] = useState(false);
  const [calendarType, setCalendarType] = useState(0);
  const [recurrenceType, setRecurrenceType] = useState(0);
  const [weekdayId, setWeekdayId] = useState(0);
  const [weekdayRepeatId, setWeekdayRepeatId] = useState(0);
  const [specificDateNum, setSpecificDateNum] = useState(0);
  const [monthId, setMonthId] = useState(0);
  const [fromChandraMasaId, setFromChandraMasaId] = useState(0);
  const [fromNakshatraId, setFromNakshatraId] = useState(0);
  const [fromTithiId, setFromTithiId] = useState(0);
  const [fromSouraMasaId, setFromSouraMasaId] = useState(0);
  const [sevaRemarks, setSevaRemarks] = useState("");

  const [addresseeName, setAddresseeName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [country, setCountry] = useState("India");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [showAddressList, setShowAddressList] = useState(false);

  const [cart, setCart] = useState<CartSeva[]>([]);
  const [totalSevaAmount, setTotalSevaAmount] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [payeeName, setPayeeName] = useState("");
  const [payeeEmail, setPayeeEmail] = useState("");
  const [payeeMobile, setPayeeMobile] = useState("");
  const [payeeCountryCode, setPayeeCountryCode] = useState("+91");
  const [payeePlace, setPayeePlace] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [calendarMonths, setCalendarMonths] = useState<CalendarMonth[]>([]);
  const [sevaCount, setSevaCount] = useState(1);
  const [sevaCountLoading, setSevaCountLoading] = useState(false);
  const [sevaCountFetched, setSevaCountFetched] = useState(false);

  const [flDeity, setFlDeity] = useState<Sannidhi | null>(null);
  const [flCentre, setFlCentre] = useState<any>(null);
  const [flCentreSevas, setFlCentreSevas] = useState<any[]>([]);
  const [flCentreSevasLoading, setFlCentreSevasLoading] = useState(false);
  const [flSelectedSevas, setFlSelectedSevas] = useState<Set<number>>(new Set());
  const [flPaymentSuccess, setFlPaymentSuccess] = useState(false);
  const [flAckData, setFlAckData] = useState<{ txnId: string; orderId: string; amount: string; sevaNames: string[] } | null>(null);

  const [cartPaymentSuccess, setCartPaymentSuccess] = useState(false);
  const [cartAckData, setCartAckData] = useState<{ txnId: string; orderId: string; amount: string; sevaNames: string[] } | null>(null);

  const [kannadaName, setKannadaName] = useState("");
  const [kannadaCity, setKannadaCity] = useState("");

  const sannidhiRef = useRef<HTMLDivElement>(null);
  const sevaRef = useRef<HTMLDivElement>(null);
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameAbortRef = useRef<AbortController | null>(null);
  const cityAbortRef = useRef<AbortController | null>(null);

  const transliterate = useCallback(async (text: string, setter: (v: string) => void, abortRef: React.MutableRefObject<AbortController | null>) => {
    if (abortRef.current) abortRef.current.abort();
    if (!text.trim()) { setter(""); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/transliterate?text=${encodeURIComponent(text)}`, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setter(data.transliteration || "");
      } else { setter(""); }
    } catch (e: any) {
      if (e?.name !== "AbortError") setter("");
    }
  }, []);

  useEffect(() => {
    if (!selectedSevaType) return;
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => transliterate(kartaName, setKannadaName, nameAbortRef), 400);
    return () => { if (nameTimerRef.current) clearTimeout(nameTimerRef.current); };
  }, [kartaName, transliterate, selectedSevaType]);

  useEffect(() => {
    if (!selectedSevaType) return;
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    cityTimerRef.current = setTimeout(() => transliterate(kartaCity, setKannadaCity, cityAbortRef), 400);
    return () => { if (cityTimerRef.current) clearTimeout(cityTimerRef.current); };
  }, [kartaCity, transliterate, selectedSevaType]);

  const { data: sannidhis = [], isLoading: sannidhisLoading } = useQuery<Sannidhi[]>({
    queryKey: ["deities", selectedSevaType?.id],
    queryFn: async () => {
      const res = await fetch(`/api/online/deities/${selectedSevaType!.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedSevaType,
  });

  const { data: centres = [] } = useQuery<any[]>({
    queryKey: ["centres"],
    queryFn: async () => {
      const res = await fetch("/api/centres");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedSevaType?.id === 1,
  });

  const { data: deitySevas = [], isLoading: sevasLoading } = useQuery<DeitySeva[]>({
    queryKey: ["deitySevas", selectedSannidhi?.id, selectedSevaType?.id],
    queryFn: async () => {
      const res = await fetch(`/api/online/deitySevas/${selectedSannidhi!.id}/${selectedSevaType!.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedSannidhi && !!selectedSevaType,
  });

  const { data: availableDates = [] } = useQuery<SevaAvailabilityDate[]>({
    queryKey: ["sevaAvailability", selectedSeva?.id],
    queryFn: async () => {
      const res = await fetch(`/api/online/sevaAvailability/${selectedSeva!.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedSeva && selectedSevaType?.id === 2,
  });

  const { data: frequentSevas = [] } = useQuery<FrequentSeva[]>({
    queryKey: ["frequentSevas"],
    queryFn: async () => {
      const res = await fetch("/api/onlineFrequentSevas");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: rashis = [] } = useQuery<Rashi[]>({
    queryKey: ["rashis"],
    queryFn: async () => {
      const res = await fetch("/api/rashis");
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

  const { data: calendarTypes = [] } = useQuery<any[]>({
    queryKey: ["calendarTypes"],
    queryFn: async () => {
      const res = await fetch("/api/calendarTypes");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: recurrenceTypes = [] } = useQuery<RecurrenceType[]>({
    queryKey: ["recurrenceTypes"],
    queryFn: async () => {
      const res = await fetch("/api/recurrenceTypes");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedSevaType?.id === 3,
  });

  const { data: nakshatras = [] } = useQuery<any[]>({
    queryKey: ["nakshatras"],
    queryFn: async () => {
      const res = await fetch("/api/nakshatras");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: tithis = [] } = useQuery<any[]>({
    queryKey: ["tithis"],
    queryFn: async () => {
      const res = await fetch("/api/tithis");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedSevaType?.id === 3,
  });

  const { data: chandraMasas = [] } = useQuery<any[]>({
    queryKey: ["chandraMasas"],
    queryFn: async () => {
      const res = await fetch("/api/chandraMasas");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedSevaType?.id === 3,
  });

  const { data: souraMasas = [] } = useQuery<any[]>({
    queryKey: ["souraMasas"],
    queryFn: async () => {
      const res = await fetch("/api/souraMasas");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedSevaType?.id === 3,
  });

  useEffect(() => {
    if (user) {
      fetch(`/api/onlineDevotee/${user.uid}`)
        .then((r) => r.json())
        .then((data) => {
          setPayeeName(data.name || "");
          setPayeeEmail(data.email || "");
          setPayeeMobile(data.mobile || "");
          setPayeeCountryCode(data.countryCode || "+91");
          if (data.city) setPayeePlace(data.city);
        })
        .catch(() => {});
    }
  }, [user?.uid]);

  useEffect(() => {
    if (availableDates.length > 0 && selectedSevaType?.id === 2) {
      generateCalendar(availableDates);
    }
  }, [availableDates]);

  useEffect(() => {
    if (pendingFrequentSevaId && deitySevas.length > 0 && selectedSannidhi) {
      const matchingSeva = deitySevas.find((s) => s.id === pendingFrequentSevaId);
      if (matchingSeva) {
        handleSelectSeva(matchingSeva);
      }
      setPendingFrequentSevaId(null);
    }
  }, [deitySevas, pendingFrequentSevaId, selectedSannidhi]);

  const kartas = devoteeData?.kartas || [];
  const addresses = devoteeData?.addresses || [];

  const filteredSannidhis = useMemo(() => {
    if (!sannidhiSearch.trim()) return sannidhis;
    return sannidhis.filter((s) => s.name.toLowerCase().includes(sannidhiSearch.toLowerCase()));
  }, [sannidhis, sannidhiSearch]);

  const filteredSevas = useMemo(() => {
    if (!sevaSearch.trim()) return deitySevas;
    return deitySevas.filter((s) => s.name.toLowerCase().includes(sevaSearch.toLowerCase()));
  }, [deitySevas, sevaSearch]);

  function generateCalendar(dates: SevaAvailabilityDate[]) {
    const months: CalendarMonth[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(today.getFullYear(), today.getMonth(), 1);

    for (let m = 0; m < 3; m++) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const monthName = current.toLocaleString("default", { month: "long", year: "numeric" });
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstWeekday = new Date(year, month, 1).getDay();

      const monthObj: CalendarMonth = { name: monthName, days: [] };

      for (let b = 0; b < firstWeekday; b++) {
        monthObj.days.push({ date: "", dbDate: "", dispDate: "", disabled: true, available: 0, selected: false });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const MM = String(month + 1).padStart(2, "0");
        const DD = String(d).padStart(2, "0");
        const formattedDate = `${year}-${MM}-${DD}`;
        const dt = new Date(year, month, d);
        const diff = Math.floor((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const outOfRange = diff < 0 || diff > 90;
        const avail = dates.find((x) => x.date === formattedDate);
        const available = avail?.available || 0;

        monthObj.days.push({
          date: d,
          dbDate: avail?.date || formattedDate,
          dispDate: avail?.dispDate || "",
          disabled: outOfRange || available === 0,
          available,
          selected: false,
        });
      }

      months.push(monthObj);
      current.setMonth(current.getMonth() + 1);
    }

    const availDates = dates.filter((d) => d.available === 1);
    if (availDates.length === 1) {
      for (const mo of months) {
        for (const day of mo.days) {
          if (day.dbDate === availDates[0].date) {
            day.selected = true;
            setSevaDate(availDates[0].date);
          }
        }
      }
    }

    setCalendarMonths(months);
    setActiveCalendarMonthIdx(0);
  }

  function selectCalendarDate(monthIdx: number, dayIdx: number) {
    const day = calendarMonths[monthIdx].days[dayIdx];
    if (day.disabled || day.available <= 0) return;

    const updated = calendarMonths.map((mo, mi) => ({
      ...mo,
      days: mo.days.map((d, di) => ({
        ...d,
        selected: mi === monthIdx && di === dayIdx,
      })),
    }));
    setCalendarMonths(updated);
    setSevaDate(day.dbDate);
  }

  function selectSevaType(type: SevaType) {
    if (type.id === 1) {
      setShowFastlineConfirm(true);
      return;
    }
    setSelectedSevaType(type);
    setStep("select");
    resetSevaForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmFastline() {
    setShowFastlineConfirm(false);
    const flType = SEVA_TYPES.find((t) => t.id === 1)!;
    setSelectedSevaType(flType);
    setStep("select");
    resetSevaForm();
    setInAbsentia("0");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetSevaForm() {
    setSelectedSannidhi(null);
    setSelectedSeva(null);
    setSannidhiSearch("");
    setSevaSearch("");
    setSevaDate("");
    setInAbsentia("");
    setReceivePrasadam("");
    setPostageId("");
    setPostageCharges(0);
    setHideCalendarPostage(false);
    setKartaName("");
    setKartaNakshatraId("");
    setKartaRashiId("");
    setKartaGotra("");
    setKartaGotraK("");
    setKartaCity("");
    setFromDate(getTomorrowDate());
    setToDate("");
    setNoEnd(false);
    setCalendarType(0);
    setRecurrenceType(0);
    setWeekdayId(0);
    setWeekdayRepeatId(0);
    setSpecificDateNum(0);
    setMonthId(0);
    setFromChandraMasaId(0);
    setFromNakshatraId(0);
    setFromTithiId(0);
    setFromSouraMasaId(0);
    setSevaRemarks("");
    setAddresseeName("");
    setAddressLine1("");
    setAddressLine2("");
    setLandmark("");
    setCountry("India");
    setPincode("");
    setState("");
    setAddressCity("");
    setCalendarMonths([]);
    setSevaCount(1);
    setSevaCountLoading(false);
    setSevaCountFetched(false);
    setFlDeity(null);
    setFlCentre(null);
    setFlCentreSevas([]);
    setFlSelectedSevas(new Set());
    setFlPaymentSuccess(false);
    setFlAckData(null);
    setCartPaymentSuccess(false);
    setCartAckData(null);
    setKannadaName("");
    setKannadaCity("");
    setValidationErrors([]);
  }

  function handleSelectSannidhi(s: Sannidhi) {
    setSelectedSannidhi(s);
    setSannidhiSearch(s.name);
    setShowSannidhiDropdown(false);
    setSelectedSeva(null);
    setSevaSearch("");
    setSevaDate("");
    setPostageId("");
    setPostageCharges(0);
    setHideCalendarPostage(false);
  }

  function handleSelectSeva(seva: DeitySeva) {
    setSelectedSeva(seva);
    setSevaSearch(`${seva.name} — ₹${formatNumber(seva.price)}`);
    setShowSevaDropdown(false);
    setSevaDate("");
    if (seva.postageCharges === 0) {
      setHideCalendarPostage(true);
      setPostageCharges(0);
      setPostageId("");
    } else {
      setHideCalendarPostage(false);
    }
  }

  function handlePostageSelect(opt: PostageOption) {
    setPostageId(String(opt.id));
    setPostageCharges(opt.amount);
  }

  function handleFrequentSeva(fsId: string) {
    if (!fsId) return;
    const fs = frequentSevas.find((f) => String(f.dsId) === fsId);
    if (!fs) return;
    setPendingFrequentSevaId(fs.dsId);
    if (!selectedSevaType || selectedSevaType.id !== 2) {
      selectSevaType(SEVA_TYPES[1]);
    }
    setTimeout(() => {
      const sannidhi = sannidhis.find((s) => s.id === fs.deityId);
      if (sannidhi) {
        setSelectedSannidhi(sannidhi);
        setSannidhiSearch(sannidhi.name);
        setShowSannidhiDropdown(false);
      }
    }, selectedSevaType?.id === 2 ? 100 : 500);
  }

  const sevaBaseAmount = selectedSeva?.price || 0;
  const computedSevaAmount = sevaBaseAmount * sevaCount;
  const postageMultiplier = selectedSevaType?.id === 3 ? (recurrenceType === 1 ? Math.ceil(sevaCount / 7) : sevaCount) : 1;
  const computedPostageAmount = postageCharges * postageMultiplier;
  const computedTotalPerSeva = computedSevaAmount + computedPostageAmount;

  function validateStep1(): boolean {
    const errors: string[] = [];

    if (selectedSevaType?.id !== 1) {
      if (!selectedSannidhi) errors.push("Please select a Sannidhi (deity).");
      if (!selectedSeva) errors.push("Please select a seva.");
    }

    if (selectedSevaType?.id === 2) {
      if (inAbsentia === "") errors.push("Please select if you are attending in person or in absentia.");
      if (inAbsentia === "1" && receivePrasadam === "") errors.push("Please select if you want prasadam.");
      if (inAbsentia === "1" && receivePrasadam === "true" && !postageId && !hideCalendarPostage) {
        errors.push("Please select a postage option.");
      }
      if (!sevaDate && !hideCalendarPostage) errors.push("Please select a seva date.");
    }

    if (selectedSevaType?.id === 3) {
      if (!fromDate) errors.push("Please select a start date.");
      if (!toDate && !noEnd) errors.push("Please select an end date or mark as no end.");
      if (!calendarType) errors.push("Please select a calendar type.");
      if (!recurrenceType) errors.push("Please select a recurrence type.");
      if ((calendarType === 2 || calendarType === 3) && !noEnd && toDate && toDate > "2027-04-06") {
        errors.push("End date for lunar/solar calendar cannot exceed 2027-04-06.");
      }
      if (recurrenceType === 2 && !weekdayId) {
        errors.push("Please select a weekday.");
      }
      if ((recurrenceType === 3 || recurrenceType === 4) && calendarType === 1) {
        if (!weekdayId && !specificDateNum) {
          errors.push("Please select a weekday or specific date.");
        }
        if (weekdayId && !weekdayRepeatId) {
          errors.push("Please select a repeat pattern.");
        }
        if (recurrenceType === 4 && specificDateNum && !monthId) {
          errors.push("Please select a month.");
        }
      }
      if ((recurrenceType === 3 || recurrenceType === 4) && (calendarType === 2 || calendarType === 3)) {
        if (!weekdayId && !fromTithiId && !fromNakshatraId) {
          errors.push("Please select a weekday, tithi, or nakshatra.");
        }
        if (weekdayId && !weekdayRepeatId) {
          errors.push("Please select a repeat pattern.");
        }
        if (recurrenceType === 4 && (fromTithiId || fromNakshatraId)) {
          if (calendarType === 2 && !fromChandraMasaId) errors.push("Please select a Chandra Masa.");
          if (calendarType === 3 && !fromSouraMasaId) errors.push("Please select a Soura Masa.");
        }
      }
      if (sevaCount <= 0) errors.push("Please select a valid date range for seva.");
      if (receivePrasadam === "") errors.push("Please select if you want prasadam.");
      if (receivePrasadam === "true" && !postageId && !hideCalendarPostage) {
        errors.push("Please select a postage option.");
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors([]);
    return true;
  }

  function goToKartaStep() {
    if (!validateStep1()) return;
    setStep("karta");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateKartaStep(): boolean {
    const errors: string[] = [];
    if (!kartaName.trim()) errors.push("Please enter the devotee's name.");
    if ((inAbsentia === "0" || !postageId) && !kartaCity.trim()) {
      errors.push("Please enter the devotee's city.");
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors([]);
    return true;
  }

  function goToAddressOrAddSeva() {
    if (!validateKartaStep()) return;
    if (receivePrasadam === "true") {
      setStep("address");
    } else {
      addSevaToCart();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateAddressStep(): boolean {
    const errors: string[] = [];
    if (!addresseeName.trim()) errors.push("Please enter the addressee name.");
    if (!country.trim()) errors.push("Please enter the country.");
    if (!pincode) errors.push("Please enter the pincode.");
    if (!state.trim()) errors.push("Please enter the state.");
    if (!addressLine1.trim()) errors.push("Please enter the street address.");
    if (!addressLine2.trim()) errors.push("Please enter the locality.");
    if (!landmark.trim()) errors.push("Please enter the landmark.");
    if (!addressCity.trim()) errors.push("Please enter the city.");
    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors([]);
    return true;
  }

  function addSevaFromAddress() {
    if (!validateAddressStep()) return;
    addSevaToCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function generateRemarks(): string {
    if (selectedSevaType?.id !== 3) return "";
    const calType = calendarTypes.find((c: any) => c.id === calendarType);
    const calendarText = (calType?.name || "") + ": ";
    let recurrenceText = "";

    const weekdayName = WEEKDAYS.find(w => w.id === weekdayId)?.name || "";
    const repeatName = WEEKDAY_REPEATS.find(w => w.id === weekdayRepeatId)?.name || "";
    const tithiName = tithis.find((t: any) => t.id === fromTithiId)?.name || "";
    const nakshatraName = nakshatras.find((n: any) => n.id === fromNakshatraId)?.name || "";
    const cmName = chandraMasas.find((c: any) => c.id === fromChandraMasaId)?.name || "";
    const smName = souraMasas.find((s: any) => s.id === fromSouraMasaId)?.name || "";
    const MONTHS = [{id:1,name:"January"},{id:2,name:"February"},{id:3,name:"March"},{id:4,name:"April"},{id:5,name:"May"},{id:6,name:"June"},{id:7,name:"July"},{id:8,name:"August"},{id:9,name:"September"},{id:10,name:"October"},{id:11,name:"November"},{id:12,name:"December"}];
    const monthName = MONTHS.find(m => m.id === monthId)?.name || "";

    if (recurrenceType === 1) {
      recurrenceText = "Everyday";
    } else if (recurrenceType === 2) {
      recurrenceText = "Every " + weekdayName;
    } else if (recurrenceType === 3) {
      if (calendarType === 1) {
        if (weekdayRepeatId && weekdayId) {
          recurrenceText = repeatName + " " + weekdayName + " of every month";
        } else if (specificDateNum) {
          recurrenceText = "On " + specificDateNum + " of every month";
        }
      } else if (calendarType === 2) {
        if (weekdayRepeatId && weekdayId) {
          recurrenceText = repeatName + " " + weekdayName + " of every month";
        } else if (fromTithiId) {
          recurrenceText = tithiName + " of every month";
        } else if (fromNakshatraId) {
          recurrenceText = nakshatraName + " nakshatra of every month";
        }
      } else if (calendarType === 3) {
        if (weekdayRepeatId && weekdayId) {
          recurrenceText = repeatName + " " + weekdayName + " of every month";
        } else if (fromTithiId) {
          recurrenceText = tithiName + " of every month";
        } else if (fromNakshatraId) {
          recurrenceText = nakshatraName + " nakshatra of every month";
        }
      }
    } else if (recurrenceType === 4) {
      if (calendarType === 1) {
        if (weekdayRepeatId && weekdayId) {
          recurrenceText = repeatName + " " + weekdayName + " of " + monthName + " month of every year";
        } else if (specificDateNum) {
          recurrenceText = specificDateNum + " " + monthName + " of every year";
        }
      } else if (calendarType === 2) {
        if (weekdayRepeatId && weekdayId) {
          recurrenceText = repeatName + " " + weekdayName;
          if (fromChandraMasaId) {
            recurrenceText += " of " + cmName + " masa  of every year";
          }
        } else if (fromChandraMasaId && fromTithiId) {
          recurrenceText = cmName + " " + tithiName + " tithi of every year";
        } else if (fromChandraMasaId && fromNakshatraId) {
          recurrenceText = cmName + " " + nakshatraName + " nakshatra of every year";
        }
      } else if (calendarType === 3) {
        if (weekdayRepeatId && weekdayId) {
          recurrenceText = repeatName + " " + weekdayName;
          if (fromSouraMasaId) {
            recurrenceText += " of " + smName + " masa  of every year";
          }
        } else if (fromSouraMasaId && fromTithiId) {
          recurrenceText = smName + " " + tithiName + " tithi of every year";
        } else if (fromSouraMasaId && fromNakshatraId) {
          recurrenceText = smName + " " + nakshatraName + " nakshatra of every year";
        }
      }
    }

    return calendarText + recurrenceText;
  }

  function addSevaToCart() {
    const isRecurring = selectedSevaType?.id === 3;
    const effectiveToDate = isRecurring && noEnd ? "9999-12-31" : toDate;
    const effectiveInAbsentia = isRecurring ? 1 : (Number(inAbsentia) || 0);
    const effectiveRemarks = isRecurring ? generateRemarks() : sevaRemarks;

    let finalSevaAmount = computedSevaAmount;
    let finalTotal = computedTotalPerSeva;
    if (isRecurring && selectedSeva?.id === 59 && noEnd && recurrenceType === 1) {
      if (finalSevaAmount > 2500000) {
        finalSevaAmount = 2500000;
        finalTotal = finalSevaAmount + computedPostageAmount;
      }
    }

    const newSeva: CartSeva = {
      sannidhiId: selectedSannidhi?.id || 0,
      sannidhiName: selectedSannidhi?.name || "",
      dsId: selectedSeva?.id || 0,
      deitySevaName: selectedSeva?.name || "",
      sevaDate,
      inAbsentia: effectiveInAbsentia,
      receivePrasadam,
      postageCharges: computedPostageAmount,
      postageId,
      amount: finalSevaAmount,
      totalAmount: finalTotal,
      name: kartaName,
      nameK: kannadaName,
      nakshatraId: kartaNakshatraId,
      rashiId: kartaRashiId,
      gotra: kartaGotra,
      gotraK: kartaGotraK,
      city: kartaCity,
      kannadaName,
      kannadaCity,
      receiptTypeId: selectedSeva?.receiptTypeId || 1,
      branchId: selectedSeva?.branchId || 1,
      calendarType: isRecurring ? calendarType : "",
      type: isRecurring ? recurrenceType : "",
      fromDate,
      toDate: effectiveToDate,
      noEnd,
      weekdayId: weekdayId || "",
      weekdayRepeatId: weekdayRepeatId || "",
      specificDate: specificDateNum || "",
      monthId: monthId || "",
      fromChandraMasaId: fromChandraMasaId || "",
      fromNakshatraId: fromNakshatraId || "",
      fromTithiId: fromTithiId || "",
      fromSouraMasaId: fromSouraMasaId || "",
      remarks: effectiveRemarks,
      mode: isRecurring ? 3 : 2,
      sevaCount,
      ...(receivePrasadam === "true" ? {
        addresseeName,
        addressLine1,
        addressLine2,
        landmark,
        country,
        pincode,
        state,
        addresseePlace: addressCity,
      } : {}),
    };

    setCart((prev) => [...prev, newSeva]);
    setTotalSevaAmount((prev) => prev + newSeva.totalAmount);
    setStep("review");
    resetSevaForm();
    setSelectedSevaType(cart.length === 0 ? selectedSevaType : selectedSevaType);
  }

  function removeFromCart(index: number) {
    setTotalSevaAmount((prev) => prev - cart[index].totalAmount);
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function goToPayee() {
    if (cart.length === 0) return;
    setStep("payee");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitSevas() {
    const errors: string[] = [];
    if (!payeeName.trim()) errors.push("Please enter your name.");
    if (!payeeEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payeeEmail))
      errors.push("Please enter a valid email.");
    if (!payeeMobile.trim()) errors.push("Please enter a mobile number.");
    if (payeeCountryCode === "+91" && !/^\d{10}$/.test(payeeMobile)) {
      errors.push("Please enter a valid 10-digit mobile number.");
    }
    if (!payeePlace.trim()) errors.push("Please enter your city/place.");

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setValidationErrors([]);

    const isRecurring = cart.every(s => s.mode === 3);
    const orderPrefix = isRecurring ? "PS" : "OTFS";
    const receiptEndpoint = "/api/newReceiptFlr";

    try {
      const initRes = await fetch("/api/initiatePaytmTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalSevaAmount, mobile: payeeMobile, orderPrefix }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        setErrorMessage(errData.details || "Failed to initiate payment. Please try again.");
        setSubmitting(false);
        return;
      }

      const { txnToken, orderId, mid, amount } = await initRes.json();

      const now = new Date();
      const addedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      const receiptBody: any = {
        name: payeeName,
        nameK: "",
        email: payeeEmail,
        countryCode: payeeCountryCode,
        mobile: payeeMobile,
        city: payeePlace,
        cityK: payeePlace,
        totalAmount: totalSevaAmount,
        paymentModeId: 6,
        addedAt,
        status: 8,
        paymentRef: orderId,
        selectedSevas: cart,
        sevaTypeId: selectedSevaType?.id || cart[0]?.mode || 2,
        uid: user?.uid || "",
      };
      if (isRecurring) {
        receiptBody.inAbsentia = 1;
      }

      const receiptRes = await fetch(receiptEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptBody),
      });

      if (!receiptRes.ok) {
        setErrorMessage("Failed to create booking record. Please try again.");
        setSubmitting(false);
        return;
      }

      sessionStorage.setItem("pendingPayment", JSON.stringify({
        flowType: "seva",
        itemNames: cart.map(s => s.deitySevaName),
        amount,
        orderId,
        ts: Date.now(),
        retryData: {
          amount: totalSevaAmount,
          mobile: payeeMobile,
          orderPrefix,
          receiptBody,
          receiptEndpoint,
        },
      }));

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`;
      form.style.display = "none";
      const fields = { mid, orderId, txnToken };
      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  async function selectFlCentre(centre: any) {
    setFlCentre(centre);
    setFlSelectedSevas(new Set());
    setFlCentreSevas([]);
    setFlCentreSevasLoading(true);
    try {
      const res = await fetch(`/api/centreSevas?endpoint=${encodeURIComponent(centre.endpoint)}`);
      if (!res.ok) throw new Error("Failed to fetch sevas");
      const sevas = await res.json();
      setFlCentreSevas(sevas.map((s: any) => ({ ...s, selected: false, price: parseFloat(s.price) || 0 })));
    } catch (err) {
      console.error("Error fetching centre sevas:", err);
      setFlCentreSevas([]);
    }
    setFlCentreSevasLoading(false);
  }


  async function submitFastline() {
    if (flSelectedSevas.size === 0) {
      setValidationErrors(["Please select at least one seva."]);
      return;
    }
    if (!flCentre) {
      setValidationErrors(["Please select a location."]);
      return;
    }
    if (!kartaName.trim()) {
      setValidationErrors(["Please enter your name."]);
      return;
    }
    if (!payeeMobile.trim() || payeeMobile.trim().length < 10) {
      setValidationErrors(["Please enter a valid mobile number."]);
      return;
    }

    const selectedSevasCheck = flCentreSevas.filter((s) => flSelectedSevas.has(s.id));
    const variableWithNoAmount = selectedSevasCheck.find(
      (s) => (s.isFixedPrice === 0 || s.isFixedPrice === "0" || s.isFixedPrice === false) && (!s.price || s.price <= 0)
    );
    if (variableWithNoAmount) {
      setValidationErrors([`Please enter an amount for ${variableWithNoAmount.name}.`]);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setValidationErrors([]);

    const selectedSevasList = flCentreSevas.filter((s) => flSelectedSevas.has(s.id));
    const total = selectedSevasList.reduce((sum, s) => sum + s.price, 0);
    const firstSeva = selectedSevasList[0];

    try {
      const initRes = await fetch("/api/initiatePaytmTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, mobile: payeeMobile }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        setErrorMessage(errData.details || "Failed to initiate payment. Please try again.");
        setSubmitting(false);
        return;
      }

      const { txnToken, orderId, mid, amount } = await initRes.json();

      const now = new Date();
      const addedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      const receiptBody = {
        devoteeName: kartaName,
        devoteeNameK: kannadaName,
        totalAmount: total,
        paymentModeId: 6,
        mobile: payeeMobile,
        city: kartaCity,
        cityK: kannadaCity,
        receiptTypeId: firstSeva?.receiptTypeId || 1,
        inAbsentia: "0",
        branchId: firstSeva?.branchId || 1,
        addedAt,
        status: 8,
        paymentRef: orderId,
        selectedSevas: selectedSevasList,
      };

      const receiptRes = await fetch("/api/newReceiptFl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptBody),
      });

      if (!receiptRes.ok) {
        setErrorMessage("Failed to create booking record. Please try again.");
        setSubmitting(false);
        return;
      }

      sessionStorage.setItem("pendingPayment", JSON.stringify({
        flowType: "fastline",
        itemNames: selectedSevasList.map((s: any) => s.name),
        amount,
        orderId,
        ts: Date.now(),
        retryData: {
          amount: total,
          mobile: payeeMobile,
          receiptBody,
          receiptEndpoint: "/api/newReceiptFl",
        },
      }));

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`;
      form.style.display = "none";
      const fields = { mid, orderId, txnToken };
      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();

    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (selectedSevaType?.id !== 3 || !calendarType || !recurrenceType) {
      return;
    }
    if (!fromDate || (!noEnd && !toDate)) {
      return;
    }
    setSevaCountLoading(true);
    setSevaCountFetched(false);
    let cancelled = false;
    (async () => {
      try {
        const effectiveToDate = noEnd ? "9999-12-31" : (toDate || "0");
        const masaId = calendarType === 2 ? (fromChandraMasaId || 0) : (calendarType === 3 ? (fromSouraMasaId || 0) : 0);
        const params = [
          calendarType, fromDate, effectiveToDate, recurrenceType,
          weekdayId || 0, specificDateNum || 0, weekdayRepeatId || 0,
          monthId || 0, fromTithiId || 0, fromNakshatraId || 0, masaId,
        ].join("/");
        const res = await fetch(`/api/recurranceCount/${params}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          const count = typeof data === "number" ? data : (typeof data?.count === "number" ? data.count : 1);
          setSevaCount(count);
          setSevaCountFetched(true);
        }
      } catch {
        if (!cancelled) setSevaCount(1);
      } finally {
        if (!cancelled) setSevaCountLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSevaType?.id, calendarType, recurrenceType, fromDate, toDate, noEnd, weekdayId, weekdayRepeatId, specificDateNum, monthId, fromTithiId, fromNakshatraId, fromSouraMasaId, fromChandraMasaId]);

  // ========== PAYEE STEP ==========
  if (step === "payee") {
    if (cartPaymentSuccess && cartAckData) {
      return (
        <div className="min-h-screen bg-[#F7F2EC]" data-testid="seva-cart-ack">
          <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
            <div className="flex items-center gap-3">
              <BookCopy className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-serif font-bold">Seva Booking</h1>
                <p className="text-sm opacity-80">Booking Confirmed</p>
              </div>
            </div>
          </div>
          <div className="px-4 mt-4 pb-12">
            <div className="bg-white rounded-lg shadow-md px-6 py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-serif font-bold text-primary mb-2" data-testid="text-cart-ack-title">Payment Successful</h2>
              <p className="text-sm text-muted-foreground mb-6">Your seva booking has been confirmed.</p>

              <div className="text-left bg-[#F7F2EC] rounded-lg p-4 mb-6">
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Transaction ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-cart-ack-txnid">{cartAckData.txnId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Order ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-cart-ack-orderid">{cartAckData.orderId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Amount Paid</span>
                  <span className="text-sm font-semibold text-primary" data-testid="text-cart-ack-amount">{"\u20B9"}{cartAckData.amount}</span>
                </div>
                <div className="py-2">
                  <span className="text-xs text-muted-foreground">Sevas Booked</span>
                  <ul className="mt-1">
                    {cartAckData.sevaNames.map((name, i) => (
                      <li key={i} className="text-xs text-primary py-0.5" data-testid={`text-cart-ack-seva-${i}`}>{"\u2022"} {name}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button onClick={() => {
                  setCart([]);
                  setTotalSevaAmount(0);
                  setCartPaymentSuccess(false);
                  setCartAckData(null);
                  setStep("home");
                  setSelectedSevaType(null);
                  resetSevaForm();
                }}
                className="uppercase font-medium rounded-md bg-[#3d2000] text-white px-8 py-3 text-sm hover:bg-[#5a3510] transition-colors"
                data-testid="button-cart-ack-new-booking">
                Book Another Seva
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24" data-testid="seva-payee">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button
            onClick={() => { setStep("review"); setValidationErrors([]); }}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
            data-testid="button-back-payee"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <User className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold" data-testid="text-payee-title">Booking Details</h1>
              <p className="text-sm opacity-80">Complete your seva booking</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-serif font-bold text-base">Contact Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                  <input type="text" value={payeeName} onChange={(e) => setPayeeName(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-payee-name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
                  <input type="email" value={payeeEmail} onChange={(e) => setPayeeEmail(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-payee-email" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Code</label>
                    <input type="text" value={payeeCountryCode} onChange={(e) => setPayeeCountryCode(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-payee-code" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Mobile *</label>
                    <input type="text" value={payeeMobile} onChange={(e) => setPayeeMobile(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-payee-mobile" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">City / Place *</label>
                  <input type="text" value={payeePlace} onChange={(e) => setPayeePlace(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-payee-place" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-serif font-bold text-base mb-3">Order Summary</h3>
              <div className="space-y-2">
                {cart.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.deitySevaName}</span>
                    <span className="font-medium">₹{formatNumber(s.totalAmount)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{formatNumber(totalSevaAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-red-600 text-xs">{err}</p>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errorMessage}</p>
            </div>
          )}

          <Button className="w-full h-12" onClick={submitSevas} disabled={submitting} data-testid="button-pay-now">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay ₹${formatNumber(totalSevaAmount)}`}
          </Button>
        </div>
      </div>
    );
  }

  // ========== REVIEW STEP ==========
  if (step === "review" && cart.length > 0) {
    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24" data-testid="seva-review">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button
            onClick={() => { setStep("select"); setValidationErrors([]); }}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
            data-testid="button-back-review"
          >
            <ArrowLeft className="h-4 w-4" />
            Add More Sevas
          </button>
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold">Seva Cart</h1>
              <p className="text-sm opacity-80">{cart.length} seva(s) — ₹{formatNumber(totalSevaAmount)}</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-3">
          {cart.map((seva, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{seva.deitySevaName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{seva.sannidhiName}</p>
                    <p className="text-xs text-muted-foreground">Devotee: {seva.name}</p>
                    {seva.sevaDate && <p className="text-xs text-muted-foreground">Date: {formatDate(seva.sevaDate)}</p>}
                    {seva.sevaCount && seva.sevaCount >= 1 && (
                      <p className="text-xs text-muted-foreground">Occurrences: {seva.sevaCount}</p>
                    )}
                    {seva.remarks && seva.mode === 3 && (
                      <p className="text-xs text-muted-foreground italic">{seva.remarks}</p>
                    )}
                    <p className="text-sm font-bold text-primary mt-1">₹{formatNumber(seva.totalAmount)}</p>
                  </div>
                  <button onClick={() => removeFromCart(index)} className="text-red-400 hover:text-red-600 p-1"
                    data-testid={`button-remove-seva-${index}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full h-11 border-dashed border-2 border-primary/40 text-primary font-medium"
            onClick={() => { setStep("select"); setValidationErrors([]); }}
            data-testid="button-add-more-sevas"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add More Sevas
          </Button>

          <Button className="w-full h-12" onClick={goToPayee} data-testid="button-proceed-payee">
            Proceed to Payment — ₹{formatNumber(totalSevaAmount)}
          </Button>
        </div>
      </div>
    );
  }

  // ========== ADDRESS STEP ==========
  if (step === "address") {
    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24" data-testid="seva-address">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button onClick={() => { setStep("karta"); setValidationErrors([]); }}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3" data-testid="button-back-address">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <MapPin className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold">Prasadam Delivery Address</h1>
              <p className="text-sm opacity-80">Where should we send the prasadam?</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base">Delivery Address</h3>
                <button className="text-xs text-primary underline" onClick={() => setShowAddressList(!showAddressList)}
                  data-testid="button-pick-address">
                  + Pick from saved
                </button>
              </div>
              {showAddressList && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {addresses.length > 0 ? addresses.map((addr: any, i: number) => (
                    <button key={i} className="w-full text-left text-xs p-2 rounded hover:bg-primary/10"
                      onClick={() => {
                        setAddresseeName(addr.addresseeName || "");
                        setAddressLine1(addr.addressLine1 || "");
                        setAddressLine2(addr.addressLine2 || "");
                        setLandmark(addr.landmark || "");
                        setCountry(addr.country || "India");
                        setPincode(addr.pincode || "");
                        setState(addr.state || "");
                        setAddressCity(addr.city || "");
                        setShowAddressList(false);
                      }}
                      data-testid={`button-address-${i}`}
                    >
                      <span className="font-semibold">{addr.addresseeName || addr.city}</span>
                      <span className="text-muted-foreground"> — {addr.addressLine1}, {addr.city}</span>
                    </button>
                  )) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No saved addresses found</p>
                  )}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Addressee Name *</label>
                  <input type="text" value={addresseeName} onChange={(e) => setAddresseeName(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-addressee-name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Country *</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-country" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Pincode *</label>
                    <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-pincode" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">State *</label>
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-state" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Street & Area *</label>
                  <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-address1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Locality *</label>
                  <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-address2" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Landmark *</label>
                  <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-landmark" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">City *</label>
                  <input type="text" value={addressCity} onChange={(e) => setAddressCity(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-address-city" />
                </div>
              </div>
            </CardContent>
          </Card>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-red-600 text-xs">{err}</p>
              ))}
            </div>
          )}

          <Button className="w-full h-11" onClick={addSevaFromAddress} data-testid="button-add-seva-address">
            <Plus className="h-4 w-4 mr-2" />
            Add Seva — ₹{formatNumber(computedTotalPerSeva)}
          </Button>
        </div>
      </div>
    );
  }

  // ========== KARTA STEP ==========
  if (step === "karta") {
    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24" data-testid="seva-karta">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button onClick={() => { setStep("select"); setValidationErrors([]); }}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3" data-testid="button-back-karta">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <User className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold">Devotee Details</h1>
              <p className="text-sm opacity-80">{selectedSeva?.name}</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base">Karta Information</h3>
                <button className="text-xs text-primary underline" onClick={() => setShowKartaList(!showKartaList)}
                  data-testid="button-pick-karta">
                  + Pick karta
                </button>
              </div>
              {showKartaList && (
                <div className="bg-muted/50 rounded-lg p-2 mb-2 max-h-32 overflow-y-auto">
                  {kartas.length > 0 ? kartas.map((karta: any, i: number) => (
                    <button key={i} className="w-full text-left text-xs p-2 rounded hover:bg-primary/10"
                      onClick={() => {
                        setKartaName(karta.name || "");
                        if (karta.nameK) {
                          setKannadaName(karta.nameK);
                        }
                        setKartaNakshatraId(String(karta.nakshatraId || ""));
                        setKartaRashiId(String(karta.rashiId || ""));
                        setKartaGotra(karta.gotra || "");
                        setKartaGotraK(karta.gotraK || "");
                        setKartaCity(karta.city || "");
                        setShowKartaList(false);
                      }}
                      data-testid={`button-karta-${i}`}
                    >
                      {karta.name}{karta.gotra ? ` (${karta.gotra})` : ""}
                    </button>
                  )) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No saved kartas found</p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Devotee Name *</label>
                    {kannadaName && <span className="text-xs font-medium text-orange-500">{kannadaName}</span>}
                  </div>
                  <input type="text" value={kartaName} onChange={(e) => setKartaName(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-karta-name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nakshatra</label>
                    <select value={kartaNakshatraId} onChange={(e) => setKartaNakshatraId(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                      data-testid="select-karta-nakshatra">
                      <option value="">Select</option>
                      {nakshatras.map((n: any) => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Rashi</label>
                    <select value={kartaRashiId} onChange={(e) => setKartaRashiId(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                      data-testid="select-karta-rashi">
                      <option value="">Select</option>
                      {rashis.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Gotra</label>
                  <input type="text" value={kartaGotra} onChange={(e) => setKartaGotra(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter gotra"
                    data-testid="input-karta-gotra" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">City {inAbsentia === "0" || !postageId ? "*" : ""}</label>
                  <input type="text" value={kartaCity} onChange={(e) => setKartaCity(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-karta-city" />
                </div>
              </div>

              {selectedSevaType?.id === 3 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <label className="text-xs text-muted-foreground block">Remarks</label>
                  <input type="text" value={sevaRemarks} onChange={(e) => setSevaRemarks(e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-seva-remarks" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm">
                <span>Seva Amount</span>
                <span>₹{formatNumber(computedSevaAmount)}</span>
              </div>
              {computedPostageAmount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>Postage</span>
                  <span>₹{formatNumber(computedPostageAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">₹{formatNumber(computedTotalPerSeva)}</span>
              </div>
            </CardContent>
          </Card>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-red-600 text-xs">{err}</p>
              ))}
            </div>
          )}

          <Button className="w-full h-11" onClick={goToAddressOrAddSeva} data-testid="button-karta-next">
            {receivePrasadam === "true" ? "Next — Enter Address" : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Seva — ₹{formatNumber(computedTotalPerSeva)}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ========== FASTLINE (Today) SELECT ==========
  if (step === "select" && selectedSevaType?.id === 1) {
    const flTotal = flCentreSevas.filter((s) => flSelectedSevas.has(s.id)).reduce((sum, s) => sum + s.price, 0);

    if (flPaymentSuccess && flAckData) {
      return (
        <div className="min-h-screen bg-[#F7F2EC]" data-testid="seva-fastline-ack">
          <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
            <div className="flex items-center gap-3">
              <Zap className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-serif font-bold">Fastline — Today's Seva</h1>
                <p className="text-sm opacity-80">Booking Confirmed</p>
              </div>
            </div>
          </div>
          <div className="px-4 mt-4 pb-12">
            <div className="bg-white rounded-lg shadow-md px-6 py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-serif font-bold text-primary mb-2" data-testid="text-fl-ack-title">Payment Successful</h2>
              <p className="text-sm text-muted-foreground mb-6">Your seva booking has been confirmed.</p>

              <div className="text-left bg-[#F7F2EC] rounded-lg p-4 mb-6">
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Transaction ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-fl-ack-txnid">{flAckData.txnId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Order ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-fl-ack-orderid">{flAckData.orderId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Amount Paid</span>
                  <span className="text-sm font-semibold text-primary" data-testid="text-fl-ack-amount">{"\u20B9"}{flAckData.amount}</span>
                </div>
                <div className="py-2">
                  <span className="text-xs text-muted-foreground">Sevas Booked</span>
                  <ul className="mt-1">
                    {flAckData.sevaNames.map((name, i) => (
                      <li key={i} className="text-xs text-primary py-0.5" data-testid={`text-fl-ack-seva-${i}`}>{"\u2022"} {name}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button onClick={() => {
                  setFlCentre(null);
                  setFlCentreSevas([]);
                  setFlSelectedSevas(new Set());
                  setFlPaymentSuccess(false);
                  setFlAckData(null);
                  setKannadaName("");
                  setKannadaCity("");
                  setKartaName("");
                  setKartaCity("");
                  setPayeeMobile("");
                  setKartaNakshatraId("");
                  setKartaRashiId("");
                  setValidationErrors([]);
                  setErrorMessage("");
                }}
                className="uppercase font-medium rounded-md bg-[#3d2000] text-white px-8 py-3 text-sm hover:bg-[#5a3510] transition-colors"
                data-testid="button-fl-ack-new-booking">
                Book Another Seva
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24" data-testid="seva-fastline">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button onClick={() => { setStep("home"); setSelectedSevaType(null); resetSevaForm(); }}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3" data-testid="button-back-fl">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <Zap className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold">Fastline — Today's Seva</h1>
              <p className="text-sm opacity-80">Book live sevas for today</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800 text-center font-medium" data-testid="text-fl-warning">
            This is only for in-person seva if you are in Sringeri today.
          </p>
        </div>

        <div className="px-4 mt-4">
          <div className="bg-white rounded-lg shadow-md px-5 py-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-primary/70">Name</label>
                {kannadaName && <span className="text-xs font-medium text-orange-500" data-testid="text-fl-kannada-name">{kannadaName}</span>}
              </div>
              <input type="text" value={kartaName} onChange={(e) => setKartaName(e.target.value)}
                placeholder="Karta's Name *"
                className="w-full text-sm text-primary placeholder:italic placeholder:text-primary/40 border-0 border-b border-primary/30 focus:border-primary bg-transparent px-1 py-2.5 focus:outline-none focus:ring-0 transition-colors"
                data-testid="input-fl-name" />
            </div>

            <div className="mt-4">
              <input type="text" value={payeeMobile} onChange={(e) => setPayeeMobile(e.target.value)}
                placeholder="Mobile Number"
                className="w-full text-sm text-primary placeholder:italic placeholder:text-primary/40 border-0 border-b border-primary/30 focus:border-primary bg-transparent px-1 py-2.5 focus:outline-none focus:ring-0 transition-colors"
                data-testid="input-fl-mobile" />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-primary/70">City</label>
                {kannadaCity && <span className="text-xs font-medium text-orange-500" data-testid="text-fl-kannada-city">{kannadaCity}</span>}
              </div>
              <input type="text" value={kartaCity} onChange={(e) => setKartaCity(e.target.value)}
                placeholder="City"
                className="w-full text-sm text-primary placeholder:italic placeholder:text-primary/40 border-0 border-b border-primary/30 focus:border-primary bg-transparent px-1 py-2.5 focus:outline-none focus:ring-0 transition-colors"
                data-testid="input-fl-city" />
            </div>

            <div className="mt-6">
              <p className="text-sm text-primary ml-1 mb-3">Choose a Location</p>
              {centres.length === 0 ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {centres.map((c: any) => (
                    <button key={c.id}
                      onClick={() => selectFlCentre(c)}
                      className={`w-full border rounded-md py-3.5 text-sm font-semibold leading-tight transition-all ${
                        flCentre?.id === c.id
                          ? "bg-primary text-white border-primary"
                          : "text-primary border-primary/30 hover:bg-primary/5 hover:border-primary"
                      }`}
                      data-testid={`button-fl-centre-${c.id}`}
                    >{c.name}</button>
                  ))}
                </div>
              )}
            </div>

            {flCentre && flCentre.id !== 1 && (
              <div className="mt-6">
                <select value={kartaNakshatraId} onChange={(e) => setKartaNakshatraId(e.target.value)}
                  className="w-full text-sm text-primary bg-transparent border-0 border-b border-primary/30 focus:border-primary px-1 py-2.5 focus:outline-none focus:ring-0 appearance-none"
                  data-testid="select-fl-nakshatra">
                  <option value="">Select a Nakshatra</option>
                  {nakshatras.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>

                <select value={kartaRashiId} onChange={(e) => setKartaRashiId(e.target.value)}
                  className="w-full text-sm text-primary bg-transparent border-0 border-b border-primary/30 focus:border-primary px-1 py-2.5 mt-4 focus:outline-none focus:ring-0 appearance-none"
                  data-testid="select-fl-rashi">
                  <option value="">Select a Rashi</option>
                  {rashis.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}

            {flCentre && (
              <div className="mt-6">
                <p className="text-sm text-primary ml-1 mb-2">Select seva</p>
                {flCentreSevasLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : flCentreSevas.length === 0 ? (
                  <p className="text-sm text-muted-foreground ml-1">No sevas available for today.</p>
                ) : (
                  <div className="mx-2">
                    {flCentreSevas.map((seva: any) => {
                      const isSelected = flSelectedSevas.has(seva.id);
                      return (
                        <div key={seva.id}>
                          <div className="flex items-center justify-between py-2.5">
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0" data-testid={`button-fl-seva-${seva.id}`}>
                              <input type="checkbox" checked={isSelected}
                                onChange={() => {
                                  const next = new Set(flSelectedSevas);
                                  if (isSelected) next.delete(seva.id);
                                  else next.add(seva.id);
                                  setFlSelectedSevas(next);
                                }}
                                className="w-4 h-4 accent-primary shrink-0" />
                              <span className="text-sm text-primary truncate">{seva.name}</span>
                            </label>
                            {seva.isFixedPrice === 0 || seva.isFixedPrice === "0" || seva.isFixedPrice === false ? (
                              <div className="ml-2 shrink-0 flex flex-col items-end">
                                <input type="text" inputMode="numeric" pattern="[0-9]*"
                                  value={seva.price || ""}
                                  placeholder={"\u20B9 Amount"}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, "");
                                    const val = raw === "" ? 0 : Math.min(parseInt(raw), 20000);
                                    const updated = flCentreSevas.map((s) => s.id === seva.id ? { ...s, price: val } : s);
                                    setFlCentreSevas(updated);
                                  }}
                                  className="border border-primary/30 rounded-md text-right p-1 w-24 text-sm text-primary"
                                  data-testid={`input-fl-seva-price-${seva.id}`} />
                              </div>
                            ) : (
                              <span className="text-sm text-primary font-medium ml-2 shrink-0">{"\u20B9"}{formatNumber(seva.price)}</span>
                            )}
                          </div>
                          <div className="border-b border-primary/20" />
                        </div>
                      );
                    })}

                    {flSelectedSevas.size > 0 && (
                      <div className="mt-4 text-right">
                        <span className="text-sm font-semibold text-primary">Total amount</span>
                        <span className="text-sm font-semibold text-primary ml-8">{"\u20B9"}{formatNumber(flTotal)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="mt-6 text-center">
                {validationErrors.map((err, i) => <p key={i} className="text-red-500 text-sm">{err}</p>)}
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 text-center">
                <p className="text-red-500 text-sm">{errorMessage}</p>
              </div>
            )}

            {flSelectedSevas.size > 0 && (
              <div className="flex justify-center mt-8">
                <button onClick={submitFastline} disabled={submitting}
                  className="uppercase font-medium rounded-md bg-[#3d2000] text-white w-2/3 py-3 text-sm flex items-center justify-center gap-2 hover:bg-[#5a3510] transition-colors disabled:opacity-50"
                  data-testid="button-fl-pay">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>Make Payment <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== SELECT STEP (One-time / Recurring) ==========
  if (step === "select" && (selectedSevaType?.id === 2 || selectedSevaType?.id === 3)) {
    return (
      <div className="min-h-screen bg-[#F7F2EC] pb-24" data-testid="seva-select">
        <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
          <button onClick={() => {
            if (cart.length > 0) { setStep("review"); }
            else { setStep("home"); setSelectedSevaType(null); resetSevaForm(); }
          }}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3" data-testid="button-back-select">
            <ArrowLeft className="h-4 w-4" />
            {cart.length > 0 ? "Back to Cart" : "Back"}
          </button>
          <div className="flex items-center gap-3">
            {selectedSevaType?.id === 2 ? <CalendarDays className="h-7 w-7" /> : <RefreshCw className="h-7 w-7" />}
            <div>
              <h1 className="text-xl font-serif font-bold">{selectedSevaType?.name}</h1>
              <p className="text-sm opacity-80">{selectedSevaType?.description}</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          {selectedSevaType?.id === 2 && frequentSevas.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <button
                  onClick={() => setUpcomingSevasOpen(!upcomingSevasOpen)}
                  className="w-full flex items-center justify-between"
                  data-testid="button-toggle-upcoming-sevas-otfs"
                >
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    Upcoming / Frequent Sevas ({frequentSevas.length})
                  </h3>
                  {upcomingSevasOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {upcomingSevasOpen && (
                  <div className="space-y-2 mt-3">
                    {[...frequentSevas].sort((a, b) => (a.orderId ?? 0) - (b.orderId ?? 0)).map((fs) => (
                      <button
                        key={fs.dsId}
                        onClick={() => handleFrequentSeva(String(fs.dsId))}
                        className="w-full flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-3 transition-all hover:shadow-md hover:border-amber-300 cursor-pointer active:scale-[0.99] text-left"
                        data-testid={`button-frequent-seva-otfs-${fs.dsId}`}
                      >
                        <div className="bg-amber-100 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                          <Star className="h-5 w-5 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground leading-tight block">{fs.deityName} - {fs.sevaName}</span>
                          <span className="text-xs text-amber-700 font-medium">₹{formatNumber(fs.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-serif font-bold text-sm">Select Sannidhi (Deity)</h3>
              <div className="relative" ref={sannidhiRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={sannidhiSearch}
                    onChange={(e) => { setSannidhiSearch(e.target.value); setShowSannidhiDropdown(true); }}
                    onFocus={() => setShowSannidhiDropdown(true)}
                    placeholder="Search sannidhi..."
                    className="w-full border border-border rounded-md pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-search-sannidhi" />
                  {sannidhiSearch && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSannidhiSearch(""); setSelectedSannidhi(null); }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {showSannidhiDropdown && (
                  <div className="absolute z-20 w-full bg-white border border-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {sannidhisLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                    ) : filteredSannidhis.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3">No sannidhis found</p>
                    ) : (
                      filteredSannidhis.map((s) => (
                        <button key={s.id}
                          onClick={() => handleSelectSannidhi(s)}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-primary/10 ${selectedSannidhi?.id === s.id ? "bg-primary/5 font-medium" : ""}`}
                          data-testid={`button-sannidhi-${s.id}`}
                        >
                          {s.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedSannidhi && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-serif font-bold text-sm">Select Seva</h3>
                <div className="relative" ref={sevaRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={sevaSearch}
                      onChange={(e) => { setSevaSearch(e.target.value); setShowSevaDropdown(true); }}
                      onFocus={() => setShowSevaDropdown(true)}
                      placeholder="Search seva..."
                      className="w-full border border-border rounded-md pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-search-seva" />
                    {sevaSearch && (
                      <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSevaSearch(""); setSelectedSeva(null); }}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  {showSevaDropdown && (
                    <div className="absolute z-20 w-full bg-white border border-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                      {sevasLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                      ) : filteredSevas.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3">No sevas found</p>
                      ) : (
                        filteredSevas.map((s) => (
                          <button key={s.id}
                            onClick={() => handleSelectSeva(s)}
                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-primary/10 flex justify-between ${selectedSeva?.id === s.id ? "bg-primary/5 font-medium" : ""}`}
                            data-testid={`button-seva-${s.id}`}
                          >
                            <span>{s.name}</span>
                            <span className="font-medium text-primary">₹{formatNumber(s.price)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedSeva && selectedSevaType?.id === 2 && !hideCalendarPostage && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-serif font-bold text-sm">Select Date</h3>
                {calendarMonths.length === 0 ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <div className="flex gap-1 bg-muted rounded-lg p-1" data-testid="seva-month-tabs">
                      {calendarMonths.map((mo, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveCalendarMonthIdx(idx)}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                            activeCalendarMonthIdx === idx
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          data-testid={`button-seva-month-${idx}`}
                        >
                          {mo.name.split(" ")[0]?.substring(0, 3)} {mo.name.split(" ")[1]}
                        </button>
                      ))}
                    </div>

                    <div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarMonths[activeCalendarMonthIdx]?.days.map((day, di) => (
                          <button key={di}
                            onClick={() => selectCalendarDate(activeCalendarMonthIdx, di)}
                            disabled={day.disabled || day.available <= 0}
                            className={`relative py-2.5 rounded-lg text-sm transition-all text-center ${
                              day.date === "" ? "" :
                              day.selected ? "bg-primary text-white font-bold" :
                              day.disabled ? "text-gray-300" :
                              day.available > 0 ? "bg-white border border-border hover:bg-primary/10 cursor-pointer" :
                              "text-gray-300 cursor-not-allowed"
                            }`}
                            data-testid={day.dbDate ? `button-date-${day.dbDate}` : undefined}
                          >
                            {day.date || ""}
                            {day.date !== "" && !day.disabled && day.available > 0 && !day.selected && (
                              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] text-muted-foreground">Available</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[10px] text-muted-foreground">Selected</span>
                      </div>
                    </div>
                  </>
                )}
                {sevaDate && <p className="text-xs text-primary font-medium text-center mt-1">Selected: {formatDate(sevaDate)}</p>}
              </CardContent>
            </Card>
          )}

          {selectedSeva && selectedSevaType?.id === 2 && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Attending</label>
                  <div className="flex gap-2">
                    <button onClick={() => { setInAbsentia("0"); setReceivePrasadam(""); setPostageId(""); setPostageCharges(0); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${inAbsentia === "0" ? "bg-primary text-white" : "bg-white border border-border"}`}
                      data-testid="button-in-person">
                      In Person
                    </button>
                    <button onClick={() => setInAbsentia("1")}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${inAbsentia === "1" ? "bg-primary text-white" : "bg-white border border-border"}`}
                      data-testid="button-in-absentia">
                      In Absentia
                    </button>
                  </div>
                </div>

                {inAbsentia === "1" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Receive Prasadam by post?</label>
                    <div className="flex gap-2">
                      <button onClick={() => setReceivePrasadam("true")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${receivePrasadam === "true" ? "bg-primary text-white" : "bg-white border border-border"}`}
                        data-testid="button-prasadam-yes">
                        Yes
                      </button>
                      <button onClick={() => { setReceivePrasadam("false"); setPostageId(""); setPostageCharges(0); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${receivePrasadam === "false" ? "bg-primary text-white" : "bg-white border border-border"}`}
                        data-testid="button-prasadam-no">
                        No
                      </button>
                    </div>
                  </div>
                )}

                {inAbsentia === "1" && receivePrasadam === "true" && !hideCalendarPostage && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Postage Option</label>
                    <div className="space-y-2">
                      {postageOptions.map((opt) => (
                        <button key={opt.id} onClick={() => handlePostageSelect(opt)}
                          className={`w-full text-left rounded-lg p-3 text-sm ${postageId === String(opt.id) ? "bg-primary text-white" : "bg-white border border-border"}`}
                          data-testid={`button-postage-${opt.id}`}
                        >
                          <div className="flex justify-between">
                            <span>{opt.name}</span>
                            <span className="font-medium">₹{formatNumber(opt.amount)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedSeva && selectedSevaType?.id === 3 && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-serif font-bold text-sm">Recurrence Settings</h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Recurrence Type</label>
                  <div className="flex flex-wrap gap-2">
                    {recurrenceTypes.map((rt) => (
                      <button key={rt.id}
                        onClick={() => {
                          setRecurrenceType(rt.id);
                          if (rt.id === 1 || rt.id === 2) {
                            setCalendarType(1);
                          } else {
                            setCalendarType(0);
                          }
                          setWeekdayId(0); setWeekdayRepeatId(0); setSpecificDateNum(0); setMonthId(0);
                          setFromChandraMasaId(0); setFromNakshatraId(0); setFromTithiId(0); setFromSouraMasaId(0);
                          setSevaCount(1); setSevaCountLoading(false); setSevaCountFetched(false);
                        }}
                        className={`px-3 py-1.5 rounded text-xs ${recurrenceType === rt.id ? "bg-primary text-white" : "bg-white border border-border"}`}
                        data-testid={`button-recurrence-${rt.id}`}
                      >
                        {rt.name}
                      </button>
                    ))}
                  </div>
                </div>

                {(recurrenceType === 3 || recurrenceType === 4) && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Calendar Type</label>
                    <div className="flex flex-wrap gap-2">
                      {calendarTypes.map((ct: any) => (
                        <button key={ct.id}
                          onClick={() => {
                            setCalendarType(ct.id);
                            setWeekdayId(0); setWeekdayRepeatId(0); setSpecificDateNum(0); setMonthId(0);
                            setFromChandraMasaId(0); setFromNakshatraId(0); setFromTithiId(0); setFromSouraMasaId(0);
                            setSevaCount(1); setSevaCountLoading(false); setSevaCountFetched(false);
                          }}
                          className={`px-3 py-1.5 rounded text-xs ${calendarType === ct.id ? "bg-primary text-white" : "bg-white border border-border"}`}
                          data-testid={`button-cal-${ct.id}`}
                        >
                          {ct.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {recurrenceType === 2 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Weekday</label>
                    <select value={weekdayId} onChange={(e) => setWeekdayId(Number(e.target.value))}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                      data-testid="select-weekday">
                      <option value={0}>Select Weekday</option>
                      {WEEKDAYS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                )}

                {(recurrenceType === 3 || recurrenceType === 4) && calendarType > 0 && (
                  <>
                    {calendarType === 1 && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-2 block">Weekday</label>
                          <select value={weekdayId} onChange={(e) => { setWeekdayId(Number(e.target.value)); if (Number(e.target.value)) { setSpecificDateNum(0); setMonthId(0); } }}
                            className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                            data-testid="select-weekday">
                            <option value={0}>Select Weekday</option>
                            {WEEKDAYS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                        {weekdayId > 0 && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Repeat</label>
                            <select value={weekdayRepeatId} onChange={(e) => setWeekdayRepeatId(Number(e.target.value))}
                              className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                              data-testid="select-weekday-repeat">
                              <option value={0}>Select Repeat</option>
                              {WEEKDAY_REPEATS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </div>
                        )}
                        {!weekdayId && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Specific Date (1-31)</label>
                            <input type="number" min={1} max={31} value={specificDateNum || ""} onChange={(e) => { setSpecificDateNum(Number(e.target.value)); if (Number(e.target.value)) { setWeekdayId(0); setWeekdayRepeatId(0); } }}
                              className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                              data-testid="input-specific-date" />
                          </div>
                        )}
                        {recurrenceType === 4 && !weekdayId && specificDateNum > 0 && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Month</label>
                            <select value={monthId} onChange={(e) => setMonthId(Number(e.target.value))}
                              className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                              data-testid="select-month">
                              <option value={0}>Select Month</option>
                              {[{id:1,name:"January"},{id:2,name:"February"},{id:3,name:"March"},{id:4,name:"April"},{id:5,name:"May"},{id:6,name:"June"},{id:7,name:"July"},{id:8,name:"August"},{id:9,name:"September"},{id:10,name:"October"},{id:11,name:"November"},{id:12,name:"December"}].map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {(calendarType === 2 || calendarType === 3) && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-2 block">Weekday</label>
                          <select value={weekdayId} onChange={(e) => { const v = Number(e.target.value); setWeekdayId(v); if (v) { setFromTithiId(0); setFromNakshatraId(0); } }}
                            className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                            data-testid="select-weekday">
                            <option value={0}>Select Weekday</option>
                            {WEEKDAYS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                        {weekdayId > 0 && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Repeat</label>
                            <select value={weekdayRepeatId} onChange={(e) => setWeekdayRepeatId(Number(e.target.value))}
                              className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                              data-testid="select-weekday-repeat">
                              <option value={0}>Select Repeat</option>
                              {WEEKDAY_REPEATS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </div>
                        )}
                        {!weekdayId && !fromNakshatraId && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Tithi</label>
                            <select value={fromTithiId} onChange={(e) => { const v = Number(e.target.value); setFromTithiId(v); if (v) { setFromNakshatraId(0); setWeekdayId(0); setWeekdayRepeatId(0); } }}
                              className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                              data-testid="select-tithi">
                              <option value={0}>Select Tithi</option>
                              {tithis.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        )}
                        {!weekdayId && !fromTithiId && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Nakshatra</label>
                            <select value={fromNakshatraId} onChange={(e) => { const v = Number(e.target.value); setFromNakshatraId(v); if (v) { setFromTithiId(0); setWeekdayId(0); setWeekdayRepeatId(0); } }}
                              className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                              data-testid="select-nakshatra">
                              <option value={0}>Select Nakshatra</option>
                              {nakshatras.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
                            </select>
                          </div>
                        )}
                        {recurrenceType === 4 && (fromTithiId > 0 || fromNakshatraId > 0) && (
                          <div>
                            {calendarType === 2 && (
                              <>
                                <label className="text-xs text-muted-foreground mb-2 block">Chandra Masa</label>
                                <select value={fromChandraMasaId} onChange={(e) => setFromChandraMasaId(Number(e.target.value))}
                                  className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                                  data-testid="select-chandra-masa">
                                  <option value={0}>Select Chandra Masa</option>
                                  {chandraMasas.map((cm: any) => <option key={cm.id} value={cm.id}>{cm.name}</option>)}
                                </select>
                              </>
                            )}
                            {calendarType === 3 && (
                              <>
                                <label className="text-xs text-muted-foreground mb-2 block">Soura Masa</label>
                                <select value={fromSouraMasaId} onChange={(e) => setFromSouraMasaId(Number(e.target.value))}
                                  className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                                  data-testid="select-soura-masa">
                                  <option value={0}>Select Soura Masa</option>
                                  {souraMasas.map((sm: any) => <option key={sm.id} value={sm.id}>{sm.name}</option>)}
                                </select>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {selectedSeva && selectedSevaType?.id === 3 && recurrenceType > 0 && (recurrenceType <= 2 || calendarType > 0) && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-serif font-bold text-sm">Date Range</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                      min={getTomorrowDate()}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white"
                      data-testid="input-from-date" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                    <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setNoEnd(false); }}
                      disabled={noEnd} min={fromDate}
                      max={(calendarType === 2 || calendarType === 3) ? "2027-04-06" : undefined}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white disabled:opacity-50"
                      data-testid="input-to-date" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={noEnd} onChange={(e) => { setNoEnd(e.target.checked); if (e.target.checked) setToDate(""); }}
                    className="rounded border-border" data-testid="check-no-end" />
                  <span className="text-muted-foreground text-xs">No end date (lifetime / 20 years)</span>
                </label>
                {(calendarType === 2 || calendarType === 3) && !noEnd && (
                  <p className="text-[10px] text-muted-foreground">Max end date for lunar/solar calendar: 2027-04-06</p>
                )}
              </CardContent>
            </Card>
          )}

          {selectedSeva && selectedSevaType?.id === 3 && sevaCountLoading && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-blue-700 font-medium">Calculating occurrences...</p>
            </div>
          )}

          {selectedSeva && selectedSevaType?.id === 3 && !sevaCountLoading && sevaCountFetched && sevaCount > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-700 font-medium">This seva will be performed {sevaCount} {sevaCount === 1 ? "time" : "times"}</p>
              <p className="text-xs text-green-600 mt-1">Total: ₹{formatNumber(sevaBaseAmount)} × {sevaCount} = ₹{formatNumber(computedSevaAmount)}</p>
            </div>
          )}

          {selectedSeva && selectedSevaType?.id === 3 && !sevaCountLoading && sevaCountFetched && sevaCount === 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-700 font-medium">No occurrences found for the selected date range and recurrence pattern. Please adjust your selections.</p>
            </div>
          )}

          {selectedSeva && selectedSevaType?.id === 3 && !sevaCountLoading && sevaCountFetched && sevaCount > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-serif font-bold text-sm">Prasadam & Postage</h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Receive Prasadam by post?</label>
                  <div className="flex gap-2">
                    <button onClick={() => setReceivePrasadam("true")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${receivePrasadam === "true" ? "bg-primary text-white" : "bg-white border border-border"}`}
                      data-testid="button-ps-prasadam-yes">Yes</button>
                    <button onClick={() => { setReceivePrasadam("false"); setPostageId(""); setPostageCharges(0); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${receivePrasadam === "false" ? "bg-primary text-white" : "bg-white border border-border"}`}
                      data-testid="button-ps-prasadam-no">No</button>
                  </div>
                </div>
                {receivePrasadam === "true" && !hideCalendarPostage && (
                  <div className="space-y-2">
                    {recurrenceType === 1 && (
                      <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                        For daily seva, prasadam postage will be done once a week.
                      </p>
                    )}
                    {postageOptions.map((opt) => (
                      <button key={opt.id} onClick={() => handlePostageSelect(opt)}
                        className={`w-full text-left rounded-lg p-3 text-sm ${postageId === String(opt.id) ? "bg-primary text-white" : "bg-white border border-border"}`}
                        data-testid={`button-ps-postage-${opt.id}`}>
                        <div className="flex justify-between">
                          <span>{opt.name}</span>
                          <span className="font-medium">₹{formatNumber(opt.amount)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedSeva && (selectedSevaType?.id !== 3 || (!sevaCountLoading && sevaCountFetched && sevaCount > 0)) && (() => {
            const isBhikshaCapped = selectedSevaType?.id === 3 && selectedSeva?.id === 59 && noEnd && recurrenceType === 1 && computedSevaAmount > 2500000;
            const displaySevaAmount = isBhikshaCapped ? 2500000 : computedSevaAmount;
            const displayPostage = computedPostageAmount;
            const displayTotal = displaySevaAmount + displayPostage;
            return (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-serif font-bold text-sm">Payment Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seva Amount</span>
                      <span>
                        {selectedSevaType?.id === 3 && sevaCount > 1 ? (
                          <span>₹{formatNumber(sevaBaseAmount)} × {sevaCount} = ₹{formatNumber(displaySevaAmount)}</span>
                        ) : (
                          <span>₹{formatNumber(displaySevaAmount)}</span>
                        )}
                      </span>
                    </div>
                    {isBhikshaCapped && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                        Guru Bhikshavandanam lifetime daily seva capped at ₹25,00,000
                      </p>
                    )}
                    {displayPostage > 0 && (() => {
                      const postageLabel = selectedSevaType?.id === 3 && postageMultiplier > 1
                        ? ` (₹${formatNumber(postageCharges)} × ${postageMultiplier}${recurrenceType === 1 ? " wks" : ""})`
                        : "";
                      return (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Postage{postageLabel}</span>
                          <span>₹{formatNumber(displayPostage)}</span>
                        </div>
                      );
                    })()}
                    <div className="border-t border-primary/20 pt-1 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">₹{formatNumber(displayTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              {validationErrors.map((err, i) => <p key={i} className="text-red-600 text-xs">{err}</p>)}
            </div>
          )}

          {selectedSeva && (selectedSevaType?.id !== 3 || (!sevaCountLoading && sevaCountFetched && sevaCount > 0)) && (
            <Button className="w-full h-11" onClick={goToKartaStep} data-testid="button-next-karta">
              Next — Enter Devotee Details
            </Button>
          )}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border shadow-lg px-4 py-3 z-40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{cart.length} seva(s)</p>
                <p className="text-lg font-serif font-bold text-primary">₹{formatNumber(totalSevaAmount)}</p>
              </div>
              <Button onClick={() => setStep("review")} className="px-6" data-testid="button-view-cart">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Review & Pay
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== HOME ==========
  return (
    <div className="min-h-screen bg-[#F7F2EC] pb-24" data-testid="seva-home">
      {/Android/i.test(navigator.userAgent) && (
        <div className="fixed inset-0 z-50 bg-[#F7F2EC]/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center" data-testid="booking-placeholder-overlay">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center">
              <BookCopy className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[#8B4513]">Seva Booking</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bookings available from midnight of 25th March 2026
            </p>
            <button
              onClick={() => navigate("/home")}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              data-testid="button-placeholder-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        </div>
      )}
      <div className="bg-primary text-primary-foreground px-4 pt-6 pb-5 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <button onClick={() => navigate("/home")}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" /> Home
          </button>
          <div className="flex items-center gap-3">
            <BookCopy className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold" data-testid="text-seva-title">Seva Booking</h1>
              <p className="text-sm opacity-80">Book sevas at Sri Sringeri Sharada Peetham</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {!selectedCentre && (
          <div>
            <h3 className="font-serif font-bold text-sm px-1 mb-3">Select Seva Location</h3>
            <div className="grid grid-cols-2 gap-3">
              {SEVA_CENTRES.map((centre) => {
                const isActive = centre.id === 1;
                return (
                  <button key={centre.id}
                    onClick={() => isActive && setSelectedCentre(centre)}
                    className={`flex flex-col items-center ${!isActive ? 'cursor-default' : ''}`}
                    disabled={!isActive}
                    data-testid={`button-centre-${centre.id}`}
                  >
                    <Card className={`w-full transition-shadow ${isActive ? 'hover:shadow-md' : 'opacity-50'}`}>
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        <div className={`rounded-xl w-12 h-12 flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-primary to-primary/80' : 'bg-gray-300'}`}>
                          <MapPin className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-center">{centre.name}</span>
                        {!isActive && <span className="text-[10px] text-muted-foreground">Coming Soon</span>}
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedCentre && (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCentre(null)}
                className="flex items-center gap-1 text-sm text-primary font-medium"
                data-testid="button-back-location"
              >
                <ArrowLeft className="h-4 w-4" /> Change Location
              </button>
            </div>
            <div className="flex items-center gap-2 px-1">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <h3 className="font-serif font-bold text-base">Booking sevas for {selectedCentre.name}</h3>
            </div>

            <div>
              <h3 className="font-serif font-bold text-sm px-1 mb-3">Choose Seva Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {SEVA_TYPES.map((type) => {
                  const icons = { fl: Zap, otfs: CalendarDays, ps: RefreshCw };
                  const Icon = icons[type.short as keyof typeof icons];
                  return (
                    <button key={type.id}
                      onClick={() => selectSevaType(type)}
                      className="flex flex-col items-center h-full"
                      data-testid={`button-seva-type-${type.short}`}
                    >
                      <Card className="w-full h-full hover:shadow-lg transition-shadow">
                        <CardContent className="p-3 flex flex-col items-center justify-center gap-2 h-full">
                          <div className="rounded-2xl w-12 h-12 flex items-center justify-center" style={{ backgroundColor: '#fcfbf7' }}>
                            <Icon className="h-6 w-6" color="#ff6600" />
                          </div>
                          <span className="text-xs font-semibold text-center leading-tight">{type.name}</span>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </div>

          </>
        )}
      </div>

      <AlertDialog open={showFastlineConfirm} onOpenChange={setShowFastlineConfirm}>
        <AlertDialogContent className="max-w-sm mx-auto rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-lg font-serif">Today's Seva</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm">
              This is only in-person seva if you are in Sringeri today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:justify-center">
            <AlertDialogCancel className="flex-1 h-10" data-testid="button-fl-cancel">Cancel</AlertDialogCancel>
            <Button onClick={confirmFastline} className="flex-1 h-10" data-testid="button-fl-continue">
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
