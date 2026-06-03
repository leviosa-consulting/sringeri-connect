import { storage } from "./storage";
import type { ReconciliationDetail } from "@shared/schema";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const _filename = typeof __filename !== "undefined" ? __filename : fileURLToPath(import.meta.url);
const _require = createRequire(_filename);
const PaytmChecksum = _require("paytmchecksum");

const SRINGERI_API_URL = process.env.VITE_SRINGERI_API_URL || "https://dsspv2.lcpl.in";
const SRINGERI_API_KEY = process.env.SRINGERI_API_KEY;

async function paytmOrderStatus(orderId: string): Promise<{
  mid: string;
  isSpct: boolean;
  body: any;
  raw: any;
} | null> {
  const PAYTM_MID_VAL = process.env.PAYTM_MID;
  const PAYTM_KEY_VAL = process.env.PAYTM_MERCHANT_KEY;
  const PAYTM_MID_SPCT_VAL = process.env.PAYTM_MID_SPCT;
  const PAYTM_KEY_SPCT_VAL = process.env.PAYTM_MERCHANT_KEY_SPCT;

  const attempts: Array<{ mid: string; key: string; isSpct: boolean }> = [];
  if (PAYTM_MID_VAL && PAYTM_KEY_VAL) attempts.push({ mid: PAYTM_MID_VAL, key: PAYTM_KEY_VAL, isSpct: false });
  if (PAYTM_MID_SPCT_VAL && PAYTM_KEY_SPCT_VAL) attempts.push({ mid: PAYTM_MID_SPCT_VAL, key: PAYTM_KEY_SPCT_VAL, isSpct: true });

  let lastResult: any = null;
  let lastUsed: { mid: string; isSpct: boolean } | null = null;

  for (const a of attempts) {
    try {
      const body = { mid: a.mid, orderId };
      const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), a.key);
      const verifyParams = { body, head: { signature: checksum } };
      const r = await fetch(`https://securegw.paytm.in/v3/order/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyParams),
      });
      const data = await r.json();
      lastResult = data;
      lastUsed = { mid: a.mid, isSpct: a.isSpct };

      const rs = data?.body?.resultInfo?.resultStatus;
      const rc = data?.body?.resultInfo?.resultCode;
      const notFound = rc === "334" || rc === 334 || /no record/i.test(data?.body?.resultInfo?.resultMsg || "");
      if (!notFound && rs) {
        return { mid: a.mid, isSpct: a.isSpct, body: data.body, raw: data };
      }
    } catch (err) {
      console.error("paytmOrderStatus attempt failed:", err);
    }
  }
  if (lastResult && lastUsed) {
    return { mid: lastUsed.mid, isSpct: lastUsed.isSpct, body: lastResult.body, raw: lastResult };
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseUpstream(text: string): any {
  try {
    const jsonStart = text.indexOf("{");
    const jsonStartArr = text.indexOf("[");
    const start = jsonStart !== -1 && (jsonStartArr === -1 || jsonStart < jsonStartArr) ? jsonStart : jsonStartArr;
    return start !== -1 ? JSON.parse(text.substring(start)) : JSON.parse(text);
  } catch {
    return null;
  }
}

export async function runReconciliation(): Promise<void> {
  const ranAt = new Date();
  const details: ReconciliationDetail[] = [];
  let checkedCount = 0;
  let ackedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let errorCount = 0;

  console.log(`[reconciliation] Starting run at ${ranAt.toISOString()}`);

  try {
    const r = await fetch(`${SRINGERI_API_URL}/api/fetchPendingTransactions`, {
      method: "GET",
      headers: {
        ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
      },
    });
    const text = await r.text();
    if (!r.ok) {
      console.error("[reconciliation] fetchPendingTransactions error:", r.status, text.slice(0, 200));
      await storage.insertReconciliationLog({ ranAt, checkedCount: 0, ackedCount: 0, failedCount: 0, pendingCount: 0, errorCount: 1, details: [{ orderId: "N/A", paytmStatus: "N/A", outcome: "error", error: `Upstream HTTP ${r.status}` }] });
      return;
    }
    const data = parseUpstream(text);
    if (!data) {
      console.error("[reconciliation] fetchPendingTransactions parse error");
      await storage.insertReconciliationLog({ ranAt, checkedCount: 0, ackedCount: 0, failedCount: 0, pendingCount: 0, errorCount: 1, details: [{ orderId: "N/A", paytmStatus: "N/A", outcome: "error", error: "Invalid upstream response" }] });
      return;
    }

    const transactions: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.transactions)
          ? data.transactions
          : [];

    console.log(`[reconciliation] Found ${transactions.length} pending transactions`);

    for (const txn of transactions) {
      const orderId = String(txn.paymentRef || txn.orderId || txn.orderID || txn.order_id || txn.txnId || "");
      const txnType = String(txn.type || txn.category || txn.txnType || txn.serviceType || "");
      if (!orderId) continue;

      checkedCount++;
      await delay(300);

      try {
        const result = await paytmOrderStatus(orderId);
        if (!result) {
          errorCount++;
          details.push({ orderId, type: txnType, paytmStatus: "UNKNOWN", outcome: "error", error: "Paytm status check failed" });
          continue;
        }

        const b = result.body || {};
        const ri = b.resultInfo || {};
        const paytmStatus = String(ri.resultStatus || "UNKNOWN");

        if (paytmStatus === "TXN_SUCCESS") {
          const ackBody: Record<string, string> = {
            ORDERID: orderId,
            STATUS: "TXN_SUCCESS",
            RESPCODE: String(ri.resultCode ?? "01"),
            RESPMSG: ri.resultMsg || "Txn Success",
          };
          if (b.txnId) ackBody.TXNID = String(b.txnId);
          if (b.bankTxnId) ackBody.BANKTXNID = String(b.bankTxnId);
          if (b.txnAmount) ackBody.TXNAMOUNT = String(b.txnAmount);
          if (b.txnDate) ackBody.TXNDATE = String(b.txnDate);
          if (b.paymentMode) ackBody.PAYMENTMODE = String(b.paymentMode);
          if (b.bankName) ackBody.BANKNAME = String(b.bankName);
          if (b.currency) ackBody.CURRENCY = String(b.currency);

          try {
            const ackRes = await fetch(`${SRINGERI_API_URL}/api/paymentAck`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
              },
              body: JSON.stringify(ackBody),
            });
            if (ackRes.ok) {
              ackedCount++;
              details.push({ orderId, type: txnType, paytmStatus, outcome: "acked", txnAmount: b.txnAmount, txnId: b.txnId });
              console.log(`[reconciliation] Acked: ${orderId}`);
            } else {
              const errText = await ackRes.text();
              errorCount++;
              details.push({ orderId, type: txnType, paytmStatus, outcome: "error", error: `ACK failed HTTP ${ackRes.status}: ${errText.slice(0, 100)}`, txnAmount: b.txnAmount });
            }
          } catch (ackErr: any) {
            errorCount++;
            details.push({ orderId, type: txnType, paytmStatus, outcome: "error", error: `ACK exception: ${ackErr?.message}` });
          }

        } else if (paytmStatus === "PENDING") {
          pendingCount++;
          details.push({ orderId, type: txnType, paytmStatus, outcome: "pending" });

        } else {
          const failBody: Record<string, string> = {
            ORDERID: orderId,
            STATUS: paytmStatus || "TXN_FAILURE",
            RESPCODE: String(ri.resultCode ?? ""),
            RESPMSG: ri.resultMsg || "Transaction Failed",
          };
          if (b.txnId) failBody.TXNID = String(b.txnId);
          if (b.bankTxnId) failBody.BANKTXNID = String(b.bankTxnId);
          if (b.txnAmount) failBody.TXNAMOUNT = String(b.txnAmount);
          if (b.txnDate) failBody.TXNDATE = String(b.txnDate);
          if (b.paymentMode) failBody.PAYMENTMODE = String(b.paymentMode);
          if (b.bankName) failBody.BANKNAME = String(b.bankName);
          if (b.currency) failBody.CURRENCY = String(b.currency);

          try {
            const failRes = await fetch(`${SRINGERI_API_URL}/api/updateFailedTransaction`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
              },
              body: JSON.stringify(failBody),
            });
            if (failRes.ok) {
              failedCount++;
              details.push({ orderId, type: txnType, paytmStatus, outcome: "marked_failed", txnAmount: b.txnAmount, txnId: b.txnId });
              console.log(`[reconciliation] Marked failed: ${orderId}`);
            } else {
              const errText = await failRes.text();
              errorCount++;
              details.push({ orderId, type: txnType, paytmStatus, outcome: "error", error: `Mark-failed HTTP ${failRes.status}: ${errText.slice(0, 100)}`, txnAmount: b.txnAmount });
            }
          } catch (failErr: any) {
            errorCount++;
            details.push({ orderId, type: txnType, paytmStatus, outcome: "error", error: `Mark-failed exception: ${failErr?.message}` });
          }
        }
      } catch (err: any) {
        errorCount++;
        details.push({ orderId, type: txnType, paytmStatus: "UNKNOWN", outcome: "error", error: err?.message || "Unknown error" });
      }
    }
  } catch (outerErr: any) {
    console.error("[reconciliation] Outer error:", outerErr);
    errorCount++;
    details.push({ orderId: "N/A", paytmStatus: "N/A", outcome: "error", error: outerErr?.message || "Unexpected error" });
  }

  try {
    await storage.insertReconciliationLog({ ranAt, checkedCount, ackedCount, failedCount, pendingCount, errorCount, details });
    console.log(`[reconciliation] Done — checked=${checkedCount} acked=${ackedCount} failed=${failedCount} pending=${pendingCount} errors=${errorCount}`);
  } catch (dbErr) {
    console.error("[reconciliation] Failed to save log:", dbErr);
  }
}
