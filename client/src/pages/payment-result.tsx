import { useEffect, useState, useRef } from "react";
import { RangoliLoader } from "@/components/rangoli-loader";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Home, ArrowLeft, RotateCcw } from "lucide-react";

interface PendingPayment {
  flowType: string;
  itemNames: string[];
  amount: string;
  orderId: string;
  is80G?: boolean;
  roomName?: string;
  reservedDate?: string;
  inAbsentia?: number;
  ts?: number;
  retryData?: any;
}

export default function PaymentResult() {
  const [, setLocation] = useLocation();
  const [processed, setProcessed] = useState(false);
  const processedRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [liveStatus, setLiveStatus] = useState("");
  const [liveTxnId, setLiveTxnId] = useState("");

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") || "";
  const status = liveStatus || params.get("status") || "";
  const txnId = liveTxnId || params.get("txnId") || "";
  const amount = params.get("amount") || "";
  const respMsg = params.get("respMsg") || "";
  const paymentMode = params.get("paymentMode") || "";
  const bankName = params.get("bankName") || "";

  const isSuccess = status === "TXN_SUCCESS" || status === "S";
  const isPending = status === "PENDING" || status === "P";

  const pendingPaymentRef = useRef<PendingPayment | null>(null);
  if (pendingPaymentRef.current === null) {
    try {
      const raw = sessionStorage.getItem("pendingPayment");
      if (raw) {
        const parsed = JSON.parse(raw);
        const THIRTY_MIN = 30 * 60 * 1000;
        if (parsed.ts && Date.now() - parsed.ts > THIRTY_MIN) {
          sessionStorage.removeItem("pendingPayment");
        } else {
          pendingPaymentRef.current = parsed;
        }
      }
    } catch {}
  }
  const pendingPayment = pendingPaymentRef.current;

  const flowType = pendingPayment?.flowType || "";
  const itemNames = pendingPayment?.itemNames || [];
  const roomName = pendingPayment?.roomName || "";
  const reservedDate = pendingPayment?.reservedDate || "";
  const sevaInAbsentia = pendingPayment?.inAbsentia === 1;

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    if (isSuccess) {
      sessionStorage.removeItem("pendingPayment");
    }
    setProcessed(true);
  }, [isSuccess, isPending, status]);

  const checkStatus = async () => {
    if (!orderId || checking) return;
    setChecking(true);
    try {
      const verifyBody: Record<string, any> = { orderId };
      if (pendingPayment?.is80G) verifyBody.is80G = true;
      const res = await fetch("/api/verifyPaytmTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyBody),
      });
      if (res.ok) {
        const data = await res.json();
        const resultStatus = data.body?.resultInfo?.resultStatus;
        if (resultStatus === "TXN_SUCCESS") {
          setLiveStatus("TXN_SUCCESS");
          setLiveTxnId(data.body?.txnId || "");
          sessionStorage.removeItem("pendingPayment");
        } else if (resultStatus === "TXN_FAILURE") {
          setLiveStatus("TXN_FAILURE");
          sessionStorage.removeItem("pendingPayment");
        }
      }
    } catch {}
    setChecking(false);
  };

  const retryPayment = async () => {
    if (!pendingPayment?.retryData || retrying) return;
    setRetrying(true);
    setRetryError("");

    try {
      const rd = pendingPayment.retryData;
      const isSeva = pendingPayment.flowType === "seva" || pendingPayment.flowType === "fastline";
      const isDonation = pendingPayment.flowType === "donation";

      let txnToken: string, newOrderId: string, mid: string;

      if (isDonation) {
        const initRes = await fetch(rd.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rd.payload),
        });
        if (!initRes.ok) {
          const errData = await initRes.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || "Failed to initiate payment");
        }
        const data = await initRes.json();
        txnToken = data.txnToken;
        newOrderId = data.orderId;
        mid = data.mid;
      } else if (pendingPayment.flowType === "accommodation") {
        const initRes = await fetch(rd.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rd.payload),
        });
        if (!initRes.ok) {
          const errData = await initRes.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || "Failed to initiate payment");
        }
        const data = await initRes.json();
        txnToken = data.txnToken;
        newOrderId = data.orderId;
        mid = data.mid;
      } else {
        const initRes = await fetch("/api/initiatePaytmTransaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: rd.amount, mobile: rd.mobile, orderPrefix: rd.orderPrefix }),
        });
        if (!initRes.ok) {
          const errData = await initRes.json().catch(() => ({}));
          throw new Error(errData.details || "Failed to initiate payment");
        }
        const data = await initRes.json();
        txnToken = data.txnToken;
        newOrderId = data.orderId;
        mid = data.mid;

        const now = new Date();
        const addedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        const receiptBody = { ...rd.receiptBody, paymentRef: newOrderId, addedAt };

        const receiptRes = await fetch(rd.receiptEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(receiptBody),
        });
        if (!receiptRes.ok) {
          throw new Error("Failed to create booking record");
        }
      }

      sessionStorage.setItem("pendingPayment", JSON.stringify({
        ...pendingPayment,
        orderId: newOrderId,
        ts: Date.now(),
      }));

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(newOrderId)}`;
      form.style.display = "none";
      for (const [key, value] of Object.entries({ mid, orderId: newOrderId, txnToken })) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      console.error("Retry payment error:", err);
      setRetryError(err.message || "Something went wrong. Please try again.");
      setRetrying(false);
    }
  };

  const hasRetryData = !!pendingPayment?.retryData;

  const getHomePath = () => {
    const host = window.location.hostname;
    if (host.startsWith("seva.")) return "/seva";
    if (host.startsWith("donate.")) return "/donation";
    if (host.startsWith("yatri.") || host.startsWith("yatra.")) return "/accommodation";
    if (host.startsWith("fastline.")) return "/fastline";
    return "/home";
  };

  const getReturnPath = () => {
    const host = window.location.hostname;
    if (flowType === "fastline") return host.startsWith("fastline.") ? "/fastline" : "/seva";
    if (flowType === "seva") return "/seva";
    if (flowType === "donation") return "/donation";
    if (flowType === "accommodation") return "/accommodation";
    return getHomePath();
  };

  const getFlowLabel = () => {
    if (flowType === "fastline") return "Seva";
    if (flowType === "seva") return "Seva";
    if (flowType === "donation") return "Donation";
    if (flowType === "accommodation") return "Booking";
    return "Payment";
  };

  if (!processed && !orderId && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EC]">
        <RangoliLoader size={64} />
      </div>
    );
  }

  if (!orderId && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EC] p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No payment information found.</p>
            <Button className="mt-4" onClick={() => setLocation(getHomePath())} data-testid="button-go-home">
              <Home className="h-4 w-4 mr-2" />Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EC] p-4 flex items-start justify-center pt-12">
      <Card className="max-w-sm w-full" data-testid="card-payment-result">
        <CardHeader className="text-center pb-2">
          {isSuccess ? (
            <>
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-lg font-serif text-green-700" data-testid="text-payment-status">
                Payment Successful
              </CardTitle>
            </>
          ) : isPending ? (
            <>
              <Loader2 className="h-14 w-14 text-yellow-500 mx-auto mb-2 animate-spin" />
              <CardTitle className="text-lg font-serif text-yellow-700" data-testid="text-payment-status">
                Payment Pending
              </CardTitle>
            </>
          ) : (
            <>
              <XCircle className="h-14 w-14 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-lg font-serif text-red-700" data-testid="text-payment-status">
                Payment Failed
              </CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {respMsg && !isSuccess && (
            <p className="text-sm text-center text-muted-foreground" data-testid="text-resp-msg">{respMsg}</p>
          )}

          <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
            {txnId && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Transaction ID</span>
                <span className="font-medium text-primary text-right text-xs break-all" data-testid="text-ack-txnid">{txnId}</span>
              </div>
            )}
            {orderId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-medium text-primary text-right text-xs break-all" data-testid="text-ack-orderid">{orderId}</span>
              </div>
            )}
            {amount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-primary" data-testid="text-ack-amount">{"\u20B9"}{amount}</span>
              </div>
            )}
            {paymentMode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Mode</span>
                <span className="font-medium">{paymentMode}</span>
              </div>
            )}
            {bankName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium">{bankName}</span>
              </div>
            )}
          </div>

          {isSuccess && itemNames.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {flowType === "donation" ? "Donations" : flowType === "accommodation" ? "Booking" : "Sevas Booked"}
              </p>
              <ul className="space-y-0.5">
                {itemNames.map((name, i) => (
                  <li key={i} className="text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isSuccess && flowType === "accommodation" && roomName && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">{roomName}</span>
              </div>
              {reservedDate && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{reservedDate}</span>
                </div>
              )}
            </div>
          )}

          {isSuccess && flowType === "fastline" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm" data-testid="text-fl-success-info">
              <p className="italic text-amber-900">
                Go to the nearest kiosk to print your receipt. Use the same phone number you used in the seva booking form.
              </p>
              <p className="mt-2 font-medium text-amber-800">Kiosk locations:</p>
              <p className="text-amber-900">
                At Sringeri — Guru Nivasa entrance, PS Office,{" "}
                Archana Counters (Sri Sharadamba Sannidhi)
              </p>
            </div>
          )}

          {isSuccess && flowType === "seva" && !sevaInAbsentia && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm" data-testid="text-seva-success-info">
              <p className="italic text-amber-900">
                Go to the nearest kiosk to print your receipt. Use the same phone number you used in the seva booking form.
              </p>
              <p className="mt-2 font-medium text-amber-800">Kiosk locations:</p>
              <p className="text-amber-900">
                At Sringeri — Guru Nivasa entrance, PS Office,{" "}
                Archana Counters (Sri Sharadamba Sannidhi)
              </p>
            </div>
          )}

          {isSuccess && flowType === "seva" && sevaInAbsentia && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm" data-testid="text-seva-absentia-info">
              <p className="text-amber-900">
                The seva will be performed on the chosen date. If you have opted for prasadam by post, it will be sent to your address.
              </p>
            </div>
          )}

          {isSuccess && flowType === "accommodation" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm" data-testid="text-accom-success-info">
              <p className="text-green-900">
                Your room booking has been confirmed. Please use the Order ID above for any assistance with your booking.
              </p>
              <p className="text-green-900 mt-2">
                You will receive an SMS with the booking reference details.
              </p>
            </div>
          )}

          {isPending && (
            <div className="text-center space-y-2">
              <p className="text-xs text-yellow-600">
                Your payment is being processed. Please check back later or contact support if the status doesn't update.
              </p>
              {orderId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkStatus}
                  disabled={checking}
                  data-testid="button-check-status"
                >
                  {checking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {checking ? "Checking..." : "Check Status"}
                </Button>
              )}
            </div>
          )}

          {retryError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2">
              <p className="text-red-600 text-xs">{retryError}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {!isSuccess && !isPending && hasRetryData && (
              <Button
                className="w-full bg-[#FF6600] hover:bg-[#e55b00]"
                onClick={retryPayment}
                disabled={retrying}
                data-testid="button-retry-payment"
              >
                {retrying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                {retrying ? "Retrying..." : "Retry Payment"}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setLocation(getReturnPath())}
                data-testid="button-back-to-flow"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {isSuccess ? `New ${getFlowLabel()}` : "Start Over"}
              </Button>
              <Button
                variant={!isSuccess && hasRetryData ? "outline" : "default"}
                className={`flex-1 ${!isSuccess && hasRetryData ? "" : "bg-[#FF6600] hover:bg-[#e55b00]"}`}
                onClick={() => setLocation(getHomePath())}
                data-testid="button-go-home"
              >
                <Home className="h-4 w-4 mr-1" />Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
