import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Rashi {
  id: number;
  name: string;
}

function formatNumber(value: number): string {
  return value ? value.toLocaleString("en-IN") : "0";
}

export default function Fastline() {
  const [kartaName, setKartaName] = useState("");
  const [kartaMobile, setKartaMobile] = useState("");
  const [kartaCity, setKartaCity] = useState("");
  const [kartaNakshatraId, setKartaNakshatraId] = useState("");
  const [kartaRashiId, setKartaRashiId] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  const [flCentre, setFlCentre] = useState<any>(null);
  const [flCentreSevas, setFlCentreSevas] = useState<any[]>([]);
  const [flCentreSevasLoading, setFlCentreSevasLoading] = useState(false);
  const [flSelectedSevas, setFlSelectedSevas] = useState<Set<number>>(new Set());

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ackData, setAckData] = useState<{ txnId: string; orderId: string; amount: string; sevaNames: string[] } | null>(null);

  const [kannadaName, setKannadaName] = useState("");
  const [kannadaCity, setKannadaCity] = useState("");
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
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => transliterate(kartaName, setKannadaName, nameAbortRef), 400);
    return () => { if (nameTimerRef.current) clearTimeout(nameTimerRef.current); };
  }, [kartaName, transliterate]);

  useEffect(() => {
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    cityTimerRef.current = setTimeout(() => transliterate(kartaCity, setKannadaCity, cityAbortRef), 400);
    return () => { if (cityTimerRef.current) clearTimeout(cityTimerRef.current); };
  }, [kartaCity, transliterate]);

  const { data: centres = [] } = useQuery<any[]>({
    queryKey: ["centres"],
    queryFn: async () => {
      const res = await fetch("/api/centres");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: nakshatras = [] } = useQuery<any[]>({
    queryKey: ["nakshatras"],
    queryFn: async () => {
      const res = await fetch("/api/nakshatras");
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

  async function selectCentre(centre: any) {
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
        body: JSON.stringify({ amount: total, mobile: kartaMobile }),
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
        mobile: kartaMobile,
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

  function resetForm() {
    setKartaName("");
    setKartaMobile("");
    setKartaCity("");
    setKartaNakshatraId("");
    setKartaRashiId("");
    setFlCentre(null);
    setFlCentreSevas([]);
    setFlSelectedSevas(new Set());
    setKannadaName("");
    setKannadaCity("");
    setPaymentSuccess(false);
    setAckData(null);
    setErrorMessage("");
    setValidationErrors([]);
  }

  const flTotal = flCentreSevas.filter((s) => flSelectedSevas.has(s.id)).reduce((sum, s) => sum + s.price, 0);

  if (paymentSuccess && ackData) {
    return (
      <div className="min-h-screen bg-[#F7F2EC]" data-testid="fastline-ack">
        <div className="px-4 pt-6 pb-4">
          <div className="max-w-2xl mx-auto flex justify-center">
            <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-14 w-auto object-contain" />
          </div>
        </div>
        <div className="px-4 mt-4 pb-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md px-6 py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-serif font-bold text-primary mb-2" data-testid="text-ack-title">Payment Successful</h2>
              <p className="text-sm text-muted-foreground mb-6">Your seva booking has been confirmed.</p>

              <div className="text-left bg-[#F7F2EC] rounded-lg p-4 mb-6">
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
                <div className="py-2">
                  <span className="text-xs text-muted-foreground">Sevas Booked</span>
                  <ul className="mt-1">
                    {ackData.sevaNames.map((name, i) => (
                      <li key={i} className="text-xs text-primary py-0.5" data-testid={`text-ack-seva-${i}`}>• {name}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button onClick={resetForm}
                className="uppercase font-medium rounded-md bg-[#3d2000] text-white px-8 py-3 text-sm hover:bg-[#5a3510] transition-colors"
                data-testid="button-ack-new-booking">
                Book Another Seva
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Sri Sringeri Sharada Peetham — Online Seva Booking
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EC]" data-testid="fastline-public">
      {/Android/i.test(navigator.userAgent) && (
        <div className="fixed inset-0 z-50 bg-[#F7F2EC]/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center" data-testid="booking-placeholder-overlay">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[#8B4513]">Fastline Seva</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bookings available from midnight of 25th March 2026
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              data-testid="button-placeholder-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      )}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Today's Seva — In Person Only</AlertDialogTitle>
            <AlertDialogDescription>
              This is only for in-person seva if you are in Sringeri today. Please confirm before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => window.history.back()} data-testid="button-fl-cancel">Go Back</AlertDialogCancel>
            <Button onClick={() => setShowWarning(false)} data-testid="button-fl-continue">Continue</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-2xl mx-auto flex justify-center">
          <img src="/assets/logo.webp" alt="Sringeri Logo" className="h-14 w-auto object-contain" />
        </div>
      </div>

      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-amber-800 text-center font-medium" data-testid="text-fl-warning">
            ⚠️ This is only for in-person seva if you are in Sringeri today.
          </p>
        </div>
      </div>

      <div className="px-4 mt-4 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md px-5 py-6">
            <h2 className="text-sm font-semibold text-primary mb-4">Devotee Details</h2>

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
              <input type="text" value={kartaMobile} onChange={(e) => setKartaMobile(e.target.value)}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {centres.map((c: any) => (
                    <button key={c.id}
                      onClick={() => selectCentre(c)}
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
                                  placeholder="₹ Amount"
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
                              <span className="text-sm text-primary font-medium ml-2 shrink-0">₹{formatNumber(seva.price)}</span>
                            )}
                          </div>
                          <div className="border-b border-primary/20" />
                        </div>
                      );
                    })}

                    {flSelectedSevas.size > 0 && (
                      <div className="mt-4 text-right">
                        <span className="text-sm font-semibold text-primary">Total amount</span>
                        <span className="text-sm font-semibold text-primary ml-8">₹{formatNumber(flTotal)}</span>
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

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Sri Sringeri Sharada Peetham — Online Seva Booking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
