import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
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
      setFlCentreSevas(sevas.map((s: any) => ({ ...s, selected: false })));
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

    setSubmitting(true);
    setErrorMessage("");
    setValidationErrors([]);

    const selectedSevasList = flCentreSevas.filter((s) => flSelectedSevas.has(s.id));
    const total = selectedSevasList.reduce((sum, s) => sum + s.price, 0);

    const obj = {
      name: kartaName,
      mobile: kartaMobile,
      city: kartaCity,
      deityId: flCentre.id,
      nakshatraId: kartaNakshatraId,
      rashiId: kartaRashiId,
      inAbsentia: "0",
      totalAmount: total,
      sevaTypeId: 1,
      selectedSevas: selectedSevasList,
      uid: "",
    };

    try {
      const res = await fetch("/api/online/fl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj),
      });

      if (!res.ok) {
        setErrorMessage("Failed to submit. Please try again.");
        setSubmitting(false);
        return;
      }

      const data = await res.json();

      if (data.orderId) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "https://api.razorpay.com/v1/checkout/embedded";
        form.style.display = "none";

        const fields: Record<string, string> = {
          key_id: data.key_id || "",
          name: "Sri Sringeri Sharada Peetham",
          description: "Payment for Sevas",
          order_id: data.orderId,
          amount: String(data.amount),
          currency: "INR",
          callback_url: data.callback_url || "https://donate.sringeri.net/rpg/onlinesevaresponse",
          cancel_url: data.cancel_url || "https://donate.sringeri.net/sevas-gnr",
          "prefill[name]": kartaName,
          "prefill[contact]": `${countryCode}${kartaMobile}`,
        };

        for (const [key, value] of Object.entries(fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } else {
        setErrorMessage("Payment could not be initiated. Please try again later.");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  const flTotal = flCentreSevas.filter((s) => flSelectedSevas.has(s.id)).reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="min-h-screen bg-[#F7F2EC]" data-testid="fastline-public">
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

            <input type="text" value={kartaName} onChange={(e) => setKartaName(e.target.value)}
              placeholder="Karta's Name *"
              className="w-full text-sm text-primary placeholder:italic placeholder:text-primary/40 border-0 border-b border-primary/30 focus:border-primary bg-transparent px-1 py-2.5 focus:outline-none focus:ring-0 transition-colors"
              data-testid="input-fl-name" />

            <input type="text" value={kartaMobile} onChange={(e) => setKartaMobile(e.target.value)}
              placeholder="Mobile Number"
              className="w-full text-sm text-primary placeholder:italic placeholder:text-primary/40 border-0 border-b border-primary/30 focus:border-primary bg-transparent px-1 py-2.5 mt-4 focus:outline-none focus:ring-0 transition-colors"
              data-testid="input-fl-mobile" />

            <input type="text" value={kartaCity} onChange={(e) => setKartaCity(e.target.value)}
              placeholder="City"
              className="w-full text-sm text-primary placeholder:italic placeholder:text-primary/40 border-0 border-b border-primary/30 focus:border-primary bg-transparent px-1 py-2.5 mt-4 focus:outline-none focus:ring-0 transition-colors"
              data-testid="input-fl-city" />

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
                            {seva.isFixedPrice !== false ? (
                              <span className="text-sm text-primary font-medium ml-2 shrink-0">₹{formatNumber(seva.price)}</span>
                            ) : (
                              <input type="number" value={seva.price || ""} onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const updated = flCentreSevas.map((s) => s.id === seva.id ? { ...s, price: val } : s);
                                setFlCentreSevas(updated);
                              }}
                                className="border border-primary/30 rounded-md text-right p-1 w-20 text-sm text-primary ml-2 shrink-0"
                                data-testid={`input-fl-seva-price-${seva.id}`} />
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
