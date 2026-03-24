import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hotel,
  Loader2,
  MapPin,
  Users,
  Calendar,
  CreditCard,
  AlertCircle,
  Info,
} from "lucide-react";

interface InventoryDay {
  date: string;
  dispDate: string;
  availability: RoomOption[];
}

interface RoomOption {
  inventoryId: number;
  dispName: string;
  rent: number;
  deposit: number;
  selected?: boolean;
}

interface CalendarDay {
  date: number | "";
  dbDate: string;
  dispDate: string;
  disabled: boolean;
  available: number;
  availability: RoomOption[];
  selected: boolean;
}

interface CalendarMonth {
  name: string;
  year: number;
  month: number;
  days: CalendarDay[];
}

const TERMS = [
  { label: "Location", text: "The room bookings done here are for devotees visiting Sringeri (Karnataka)" },
  { label: "Booking Timeline", text: "Bookings must be made a minimum of 2 days prior to the required date, subject to availability" },
  { label: "Stay Duration", text: "Each booking/allotment is valid for a 24-hour stay" },
  { label: "Maximum per room", text: "Maximum of 4 persons are allowed per room" },
  { label: "ID Requirement", text: "Pilgrims must produce the Aadhaar Card / Passport used for availing the accommodation" },
  { label: "Booking Expiry", text: "If accommodation is not availed on the specified date, the booking will expire. Re-scheduling is not permitted" },
  { label: "Refund", text: "In the event of non-utilization, only the caution deposit (if applicable) will be refunded" },
  { label: "Individuals Not Allowed", text: "Singles are not permitted to book a room. If a second occupant is added as a dummy, entry will be denied without refund" },
  { label: "Security Deposit", text: "A refundable deposit is collected at check-in and refunded at checkout upon return of room keys" },
  { label: "Management Discretion", text: "Room allotment is at management's discretion. If a room is not allotted, a refund will be issued" },
];

const STEP_LABELS = ["Select Date & Room", "Occupant Details", "Review & Pay"];

const START_DAY = 3;
const END_DAY = 92;
const MONTH_COUNT = 3;

export default function Accommodation() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeMonthIdx, setActiveMonthIdx] = useState(0);
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [showTermsConfirm, setShowTermsConfirm] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ackData, setAckData] = useState<{ txnId: string; orderId: string; amount: string; roomName: string; reservedDate: string } | null>(null);

  const roomSectionRef = useRef<HTMLDivElement>(null);

  const [occupant1, setOccupant1] = useState({ name: "", age: "", idNumber: "" });
  const [occupant2, setOccupant2] = useState({ name: "", age: "", idNumber: "" });
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/onlineInventory"],
    queryFn: async () => {
      const res = await fetch("/api/onlineInventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json() as Promise<InventoryDay[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const today = useMemo(() => new Date(), []);

  const months = useMemo<CalendarMonth[]>(() => {
    const result: CalendarMonth[] = [];
    const current = new Date(today.getFullYear(), today.getMonth(), 1);

    for (let i = 0; i < MONTH_COUNT; i++) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const monthObj: CalendarMonth = {
        name: current.toLocaleString("default", { month: "long" }),
        year,
        month,
        days: [],
      };

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay();

      for (let k = 0; k < firstDayOfWeek; k++) {
        monthObj.days.push({
          date: "",
          dbDate: "",
          dispDate: "",
          disabled: true,
          available: 0,
          availability: [],
          selected: false,
        });
      }

      for (let j = 1; j <= daysInMonth; j++) {
        const dateObj = new Date(year, month, j);
        dateObj.setHours(12, 0, 0, 0);
        const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const daysFromToday = Math.floor(
          (dateObj.getTime() - todayNorm.getTime()) / (1000 * 60 * 60 * 24)
        );
        const disabled = daysFromToday < START_DAY || daysFromToday > END_DAY;
        const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
        const inventoryDay = inventory?.find((item) => item.date === isoDate);

        monthObj.days.push({
          date: j,
          dbDate: inventoryDay?.date || isoDate,
          dispDate: inventoryDay?.dispDate || "",
          disabled,
          available: inventoryDay ? inventoryDay.availability.length : 0,
          availability: inventoryDay?.availability || [],
          selected: false,
        });
      }

      result.push(monthObj);
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, [today, inventory]);

  const handleSelectDate = useCallback((day: CalendarDay) => {
    if (day.disabled || !day.date) return;
    if (day.available <= 0) {
      setErrorMessage("No rooms available for this date");
      return;
    }
    setErrorMessage("");
    setSelectedDate(day);
    setSelectedRoom(null);
    setTimeout(() => {
      roomSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleSelectRoom = useCallback((room: RoomOption) => {
    setErrorMessage("");
    setSelectedRoom((prev) => (prev?.inventoryId === room.inventoryId ? null : room));
  }, []);

  const validateStep1 = () => {
    if (!selectedRoom) {
      setErrorMessage("Please select a room");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const validateStep2 = () => {
    if (!occupant1.name.trim() || !occupant1.age.trim() || !occupant1.idNumber.trim() || !mobile.trim() || !email.trim() || !occupant2.name.trim() || !occupant2.age.trim() || !occupant2.idNumber.trim()) {
      setErrorMessage("All fields are mandatory");
      return false;
    }
    if (mobile.length !== 10) {
      setErrorMessage("Mobile number should be 10 digits");
      return false;
    }
    if (occupant1.idNumber === occupant2.idNumber) {
      setErrorMessage("Both occupants should not have the same ID number");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleProceed = () => {
    if (currentStep === 1 && validateStep1()) {
      setShowLocationConfirm(true);
      return;
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLocationConfirm = () => {
    setShowLocationConfirm(false);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrorMessage("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function loadPaytmScript(mid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById("paytm-checkout-js");
      if (existing) existing.remove();
      (window as any).Paytm = undefined;
      const script = document.createElement("script");
      script.id = "paytm-checkout-js";
      script.type = "application/javascript";
      script.crossOrigin = "anonymous";
      script.src = `https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/${mid}.js`;
      script.onload = () => {
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          const sdk = (window as any).Paytm?.CheckoutJS;
          if (sdk && typeof sdk.init === "function") {
            clearInterval(poll);
            resolve();
          } else if (attempts > 50) {
            clearInterval(poll);
            reject(new Error("Paytm SDK failed to initialize"));
          }
        }, 100);
      };
      script.onerror = () => reject(new Error("Failed to load Paytm SDK"));
      document.head.appendChild(script);
    });
  }

  const handleSubmit = async () => {
    if (!selectedRoom || !selectedDate || !user) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const reservationData = {
        reservedDate: selectedDate.dbDate,
        mobileNumber: mobile,
        email,
        occupantName1: occupant1.name,
        occupantAge1: occupant1.age,
        occupantIdType1: 1,
        occupantIdNumber1: occupant1.idNumber,
        occupantName2: occupant2.name,
        occupantAge2: occupant2.age,
        occupantIdType2: 1,
        occupantIdNumber2: occupant2.idNumber,
        roomCount: 1,
        rent: selectedRoom.rent,
        deposit: selectedRoom.deposit,
        inventoryId: selectedRoom.inventoryId,
        uid: user.uid,
        filter: {},
      };

      const res = await fetch("/api/onlineReservationPtm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.details || errData.error || "Failed to submit reservation. Please try again.");
        setSubmitting(false);
        return;
      }

      const { txnToken, orderId, mid, amount } = await res.json();

      if (!txnToken || !orderId || !mid) {
        setErrorMessage("Reservation submitted but payment details are missing. Please contact support.");
        setSubmitting(false);
        return;
      }

      const roomName = selectedRoom.dispName;
      const reservedDateDisp = selectedDate.dispDate || selectedDate.dbDate;

      sessionStorage.setItem("pendingPayment", JSON.stringify({
        flowType: "accommodation",
        itemNames: [roomName],
        amount,
        orderId,
        roomName,
        reservedDate: reservedDateDisp,
        ts: Date.now(),
      }));

      await loadPaytmScript(mid);

      const config = {
        root: "",
        flow: "DEFAULT",
        data: {
          orderId: orderId,
          token: txnToken,
          tokenType: "TXN_TOKEN",
          amount: amount,
        },
        handler: {
          notifyMerchant: (eventName: string, data: any) => {
            console.log("Paytm notifyMerchant:", eventName, data);
          },
        },
        merchant: {
          mid: mid,
          redirect: true,
        },
      };

      const checkoutJS = (window as any).Paytm.CheckoutJS;
      await checkoutJS.init(config);
      checkoutJS.invoke();
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDayCellClass = (day: CalendarDay) => {
    if (!day.date) return "";
    if (selectedDate?.dbDate === day.dbDate) return "bg-primary text-white font-bold shadow-md ring-2 ring-primary/30";
    if (day.disabled) return "text-muted-foreground/30 cursor-not-allowed";
    if (day.available === 0) return "text-red-400/70 cursor-not-allowed font-semibold";
    if (day.available > 0) return "text-foreground hover:bg-primary/10 cursor-pointer font-bold";
    return "";
  };

  if (paymentSuccess && ackData) {
    return (
      <div className="pb-24 lg:pb-8">
        <div className="bg-primary pt-8 pb-6 px-6 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <Hotel className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-serif font-bold">Booking Confirmed</h1>
                <p className="text-sm opacity-80">Yatri Nivas, Sringeri</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mt-6">
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-serif font-bold text-primary mb-2" data-testid="text-ack-title">Payment Successful</h2>
              <p className="text-sm text-muted-foreground mb-6">Your accommodation has been booked successfully.</p>

              <div className="text-left bg-muted/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Transaction ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-ack-txnid">{ackData.txnId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Order ID</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-ack-orderid">{ackData.orderId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Amount Paid</span>
                  <span className="text-sm font-semibold text-primary" data-testid="text-ack-amount">₹{ackData.amount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary/10">
                  <span className="text-xs text-muted-foreground">Room</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-ack-room">{ackData.roomName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-xs text-muted-foreground">Reserved Date</span>
                  <span className="text-xs font-medium text-primary" data-testid="text-ack-date">{ackData.reservedDate}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    setPaymentSuccess(false);
                    setAckData(null);
                    setCurrentStep(1);
                    setSelectedDate(null);
                    setSelectedRoom(null);
                    setOccupant1({ name: "", age: "", idNumber: "" });
                    setOccupant2({ name: "", age: "", idNumber: "" });
                    setMobile("");
                    setEmail("");
                    setErrorMessage("");
                  }}
                  data-testid="button-ack-new-booking"
                >
                  Book Another Room
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/home")}
                  data-testid="button-ack-home"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Terms and conditions screen
  if (!termsAccepted) {
    return (
      <div className="pb-24 lg:pb-8">
        <div className="bg-primary pt-8 pb-6 px-6 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <button onClick={() => setLocation("/home")} className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <Hotel className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-serif font-bold" data-testid="text-page-title">Book Accommodation</h1>
                <p className="text-sm opacity-80">Yatri Nivas, Sringeri</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-[11px] leading-tight text-amber-800 font-medium text-center">
            Payment debited but no confirmation? Please wait or email <a href="mailto:online@sringeri.net" className="underline font-bold">online@sringeri.net</a>. <span className="font-bold">DO NOT RE-BOOK.</span>
          </p>
        </div>

        <div className="px-4 mt-4 space-y-4">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-serif font-bold mb-3 text-center" data-testid="text-terms-heading">Terms & Conditions</h2>
              <p className="text-xs text-muted-foreground text-center mb-4">Please review each item before proceeding</p>
              <div className="space-y-2.5">
                {TERMS.map((term, idx) => (
                  <div key={idx} className="flex items-start gap-2.5" data-testid={`text-term-${idx}`}>
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">{term.label}:</span> {term.text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  For inquiries, contact helpline: <a href="tel:08265252525" className="font-semibold underline">08265-252525</a> / <a href="tel:08265295123" className="font-semibold underline">295123</a>
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={() => setShowTermsConfirm(true)}
            data-testid="button-agree-terms"
          >
            Proceed
          </Button>
        </div>

        <AlertDialog open={showTermsConfirm} onOpenChange={setShowTermsConfirm}>
          <AlertDialogContent className="max-w-[90vw] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Accept Terms & Conditions</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                By continuing, you confirm that you have read and agree to all the terms and conditions for accommodation at Sringeri.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-terms-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowTermsConfirm(false); setTermsAccepted(true); }} data-testid="button-terms-continue">Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-primary pt-8 pb-6 px-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <button onClick={() => { if (currentStep > 1) handleBack(); else setTermsAccepted(false); }} className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3" data-testid="button-back-step">
            <ArrowLeft className="h-4 w-4" />
            {currentStep > 1 ? "Back" : "Terms"}
          </button>
          <div className="flex items-center gap-3">
            <Hotel className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-serif font-bold">Book Accommodation</h1>
              <p className="text-sm opacity-80">Yatri Nivas, Sringeri</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-[11px] leading-tight text-amber-800 font-medium text-center">
          Payment debited but no confirmation? Please wait or email <a href="mailto:online@sringeri.net" className="underline font-bold">online@sringeri.net</a>. <span className="font-bold">DO NOT RE-BOOK.</span>
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between" data-testid="step-progress">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isComplete = currentStep > stepNum;
            return (
              <div key={idx} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-primary text-white shadow-lg ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : stepNum}
                  </div>
                  <span className={`text-[10px] mt-1 text-center leading-tight ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 -mt-4 ${isComplete ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 mt-2 space-y-4">
        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg" data-testid="text-error">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-sm text-red-700">{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Calendar & Room Selection */}
        {currentStep === 1 && (
          <>
            {inventoryLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading availability...</p>
              </div>
            ) : (
              <>
                {/* Month Tabs */}
                <div className="flex gap-1 bg-muted rounded-lg p-1" data-testid="month-tabs">
                  {months.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveMonthIdx(idx)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        activeMonthIdx === idx
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`button-month-${idx}`}
                    >
                      {m.name.substring(0, 3)} {m.year}
                    </button>
                  ))}
                </div>

                {/* Calendar Grid */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-center font-serif font-semibold text-sm mb-3">
                      {months[activeMonthIdx]?.name} {months[activeMonthIdx]?.year}
                    </h3>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Date Cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {months[activeMonthIdx]?.days.map((day, idx) => (
                        <div
                          key={idx}
                          onClick={() => day.date && handleSelectDate(day)}
                          className={`relative text-center py-2.5 rounded-lg text-sm transition-all ${getDayCellClass(day)}`}
                          data-testid={day.date ? `date-cell-${day.dbDate}` : undefined}
                        >
                          {day.date || ""}
                          {day.date !== "" && !day.disabled && day.available > 0 && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500" />
                          )}
                          {day.date !== "" && !day.disabled && day.available === 0 && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-500 leading-none">Full</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] text-muted-foreground">Available</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-red-500">Full</span>
                        <span className="text-[10px] text-muted-foreground">Unavailable</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[10px] text-muted-foreground">Selected</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Date Info & Room Selection */}
                {selectedDate && (
                  <Card ref={roomSectionRef} data-testid="card-room-selection" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">
                          {selectedDate.dispDate || new Date(selectedDate.dbDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <h3 className="font-serif text-sm font-semibold mb-3">Select a Building</h3>
                      <div className="space-y-3">
                        {selectedDate.availability.map((room) => {
                          const isSelected = selectedRoom?.inventoryId === room.inventoryId;
                          return (
                            <div
                              key={room.inventoryId}
                              onClick={() => handleSelectRoom(room)}
                              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/40 hover:shadow-sm"
                              }`}
                              data-testid={`room-option-${room.inventoryId}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{room.dispName}</p>
                                  <p className="text-lg font-bold text-primary mt-1">
                                    {formatCurrency(room.rent + room.deposit)}
                                  </p>
                                  <div className="flex gap-3 mt-1">
                                    <span className="text-[10px] text-muted-foreground">
                                      Rent: {formatCurrency(room.rent)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Deposit: {formatCurrency(room.deposit)}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Proceed Button */}
                {selectedDate && (
                  <Button className="w-full h-12 text-base font-semibold" onClick={handleProceed} data-testid="button-proceed-step1">
                    Proceed
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {/* STEP 2: Occupant Details */}
        {currentStep === 2 && (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-serif font-semibold">Occupant 1 (Primary)</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                    <input
                      type="text"
                      value={occupant1.name}
                      onChange={(e) => setOccupant1((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Enter full name"
                      data-testid="input-occupant1-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Age</label>
                      <input
                        type="number"
                        value={occupant1.age}
                        onChange={(e) => setOccupant1((p) => ({ ...p, age: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="Age"
                        data-testid="input-occupant1-age"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Aadhaar / Passport</label>
                      <input
                        type="text"
                        value={occupant1.idNumber}
                        onChange={(e) => setOccupant1((p) => ({ ...p, idNumber: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="ID Number"
                        data-testid="input-occupant1-id"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Mobile Number</label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="10-digit mobile number"
                      data-testid="input-mobile"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="your@email.com"
                      data-testid="input-email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-serif font-semibold">Occupant 2</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                    <input
                      type="text"
                      value={occupant2.name}
                      onChange={(e) => setOccupant2((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Enter full name"
                      data-testid="input-occupant2-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Age</label>
                      <input
                        type="number"
                        value={occupant2.age}
                        onChange={(e) => setOccupant2((p) => ({ ...p, age: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="Age"
                        data-testid="input-occupant2-age"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Aadhaar / Passport</label>
                      <input
                        type="text"
                        value={occupant2.idNumber}
                        onChange={(e) => setOccupant2((p) => ({ ...p, idNumber: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="ID Number"
                        data-testid="input-occupant2-id"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={handleBack} data-testid="button-back-step2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button className="flex-1 h-12 text-base font-semibold" onClick={handleProceed} data-testid="button-proceed-step2">
                Proceed
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* STEP 3: Summary & Payment */}
        {currentStep === 3 && selectedDate && selectedRoom && (
          <>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-serif font-semibold text-center mb-6">Booking Summary</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Booking</p>
                      <p className="font-semibold text-sm">
                        {selectedDate.dispDate || new Date(selectedDate.dbDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Hotel className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Building</p>
                      <p className="font-semibold text-sm">{selectedRoom.dispName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Occupants</p>
                      <p className="font-semibold text-sm">{occupant1.name}</p>
                      <p className="text-sm text-muted-foreground">{occupant2.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="text-sm">{mobile} &middot; {email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-muted-foreground">Room Rent</span>
                    <span>{formatCurrency(selectedRoom.rent)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-3">
                    <span className="text-muted-foreground">Security Deposit</span>
                    <span>{formatCurrency(selectedRoom.deposit)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="font-bold">Total Amount</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(selectedRoom.rent + selectedRoom.deposit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={handleBack} data-testid="button-back-step3">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1 h-12 text-base font-semibold"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="button-pay"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {submitting ? "Processing..." : "Proceed to Pay"}
              </Button>
            </div>
          </>
        )}
      </div>
      <AlertDialog open={showLocationConfirm} onOpenChange={setShowLocationConfirm}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Confirm Location</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Selected location: <span className="font-semibold text-foreground">{selectedRoom?.dispName}</span> at <span className="font-semibold text-foreground">SRINGERI</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-location-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLocationConfirm} data-testid="button-location-continue">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
