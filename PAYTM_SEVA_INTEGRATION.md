# Paytm Integration — Seva Booking Payments

This document describes exactly how Paytm payments are implemented for Seva bookings in this project, so the same integration can be replicated in another Replit project.

## 1. Overview of the flow

Seva booking payment uses Paytm's **Server-to-Server (S2S) / SDK Redirect flow** with the **Orders v1 "Transaction Token" API** — not the older `checksumhash`-only redirect flow. Sequence:

1. Frontend (`client/src/pages/seva.tsx`) validates the cart/payee form → calls backend `/api/initiatePaytmTransaction` to get a `txnToken`.
2. Backend generates a unique `orderId`, calls Paytm's `initiateTransaction` API with a checksum, gets back a `txnToken`.
3. Frontend then calls the backend's booking-creation endpoint (`/api/newReceiptFlr` for seva) **before** redirecting to Paytm, to pre-create a "pending" booking record tied to that `orderId`.
4. Frontend saves a `pendingPayment` object to `sessionStorage` (for recovery if the browser is closed mid-payment), then auto-submits a hidden HTML form via POST directly to Paytm's hosted payment page (`showPaymentPage`), passing `mid`, `orderId`, `txnToken`.
5. User completes payment on Paytm's page. Paytm POSTs the result back to our server's `callbackUrl` (`/api/paytm-callback`).
6. Backend verifies the checksum on the callback, then does an **independent server-side status check** against Paytm (`/v3/order/status`) — this authoritative result (not the raw callback fields) is what gets acknowledged to the upstream booking system and shown to the user.
7. Backend redirects the browser to `/payment-result?...` with the verified status/txn details as query params; the frontend page there renders success/failure to the user.

Two merchant identities exist side by side: a **regular MID** (seva/fastline/accommodation) and an **80G-donation MID (SPCT)**, selected purely by an `is80G` flag passed by the caller. Seva bookings always use the regular MID.

## 2. Required configuration / environment secrets

| Secret | Purpose |
|---|---|
| `PAYTM_MID` | Merchant ID for regular transactions (seva, fastline, accommodation) |
| `PAYTM_MERCHANT_KEY` | Merchant key/secret used to sign/verify checksums for the regular MID |
| `PAYTM_MID_SPCT` | Merchant ID for 80G-tax-exempt donations only (not used by seva) |
| `PAYTM_MERCHANT_KEY_SPCT` | Merchant key for the SPCT MID |

These come from the Paytm Business Dashboard for each merchant account. In the new project, request them via Replit's secrets manager (never hardcode). If unset, every Paytm route returns `500 { error: "Paytm credentials not configured" }` — routes fail closed, not silently.

**NPM dependency**: `paytmchecksum` (`^1.5.1`) — official Paytm Node.js checksum/signature library. Import as `const PaytmChecksum = require("paytmchecksum")`.

**Paytm endpoints used** (production gateway `securegw.paytm.in` — swap to `securegw-stage.paytm.in` for testing):
- `POST https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=...&orderId=...` — get txnToken
- `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=...&orderId=...` — hosted checkout page (browser form POST, not fetch)
- `POST https://securegw.paytm.in/v3/order/status` — server-side status/verification check

## 3. Backend routes to replicate

### `POST /api/initiatePaytmTransaction`
Generic initiator used by both seva and fastline booking flows.

Request body: `{ amount: number, mobile?: string, orderPrefix?: string }`

Logic:
```js
// 1. Read PAYTM_MID / PAYTM_MERCHANT_KEY from env; 500 if missing.
// 2. Validate amount > 0.
// 3. Build a unique orderId: `${orderPrefix||"FL"}_${yyyyMMddHHmmss}_${3-digit random}`
// 4. Build paytmParams.body:
{
  requestType: "Payment",
  mid: PAYTM_MID,
  websiteName: "DEFAULT",
  orderId,
  txnAmount: { value: amount.toFixed(2), currency: "INR" },
  userInfo: { custId: mobile || "GUEST" },
  callbackUrl: `${protocol}://${host}/api/paytm-callback`,
}
// 5. checksum = PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), PAYTM_MERCHANT_KEY)
// 6. paytmParams.head = { signature: checksum }
// 7. POST to initiateTransaction?mid=...&orderId=... with paytmParams as JSON body
// 8. If body.resultInfo.resultStatus === "S" and body.txnToken exists:
//      return { txnToken, orderId, mid, amount }
//    else: 500 with resultMsg
```

Important: `websiteName: "DEFAULT"` must match whatever website is configured against that MID in the Paytm dashboard (staging vs. production websites differ — commonly `WEBSTAGING` for staging, a custom name for production).

### `POST /api/newReceiptFlr` (seva-specific booking creation)
This is **not** a Paytm route itself — it's the proxy call to the upstream Sringeri booking API that records the seva order as "pending" using `paymentRef: orderId` and `status: 8` (pending-payment sentinel), `paymentModeId: 6` (Paytm). In a new project this maps to whatever "create a pending order" endpoint your own backend/DB uses. The key design point to replicate: **create the order record before redirecting to Paytm**, keyed by the same `orderId`, so the callback can later look it up and update it.

### `POST /api/verifyPaytmTransaction`
Used for manual/explicit verification (e.g., a "check status" retry button) rather than the callback.

Request body: `{ orderId: string, is80G?: boolean }`

Logic: picks MID/key based on `is80G` (SPCT vs regular), builds `{ body: { mid, orderId }, head: { signature } }`, POSTs to `https://securegw.paytm.in/v3/order/status`, and normalizes the response to `{ verified: boolean, status, txnId, txnAmount, resultMsg }`. Treats `TXN_SUCCESS` in either `body.txnInfo.STATUS` or `body.resultInfo.resultStatus` as success.

### Internal helper: dual-MID order-status check
A shared helper builds an `attempts` array trying the regular MID/key first, then falling back to the SPCT MID/key, generating a fresh checksum for each, and treating Paytm's "no record found" (resultCode `334`) as "try the next MID" rather than a hard failure. Useful when you don't know upfront which MID an order belongs to (e.g., admin reconciliation tooling). For seva-only replication, you can skip the dual-MID fallback and just always use the regular MID.

### `POST /api/paytm-callback` — the critical security-sensitive route
This is the one route Paytm itself calls (server-to-server / browser redirect POST after payment). Must implement exactly this order of operations:

1. Log the raw callback body for audits.
2. Determine which MID/key pair this transaction used: default to regular MID/key; if `paytmResponse.MID === PAYTM_MID_SPCT`, switch to SPCT MID/key.
3. **Checksum verification (mandatory, fail-closed):**
   - If a key is configured and `CHECKSUMHASH` is missing from the callback → treat as failed/untrusted, redirect to `/payment-result?status=FAILED`. Do NOT treat a missing checksum as equivalent to "unverified but proceed" — reject it.
   - Otherwise, strip `CHECKSUMHASH` from the payload and call `PaytmChecksum.verifySignature(dataWithoutChecksum, key, CHECKSUMHASH)`. If invalid → redirect to failure. This step alone stops attackers from forging a fake success callback.
4. **Server-side re-verification (authoritative):** regardless of what STATUS the callback claims, call `https://securegw.paytm.in/v3/order/status` again with a freshly generated checksum for `{ mid, orderId }`. Use **this** response's `resultInfo.resultStatus` (`TXN_SUCCESS` / `TXN_FAILURE` / `PENDING`) as the verified status, txnId, and amount — overriding whatever the raw callback said. This defends against a compromised/spoofed callback since Paytm's own status endpoint is the source of truth.
5. Build an ack payload from a whitelist of fields (`BANKNAME, BANKTXNID, CURRENCY, PAYMENTMODE, ORDERID, RESPCODE, RESPMSG, STATUS, TXNDATE, TXNID, TXNAMOUNT`), overwrite `STATUS` with the **verified** status, and POST it to your own upstream/booking system's "payment acknowledged" endpoint (this is what actually marks the seva booking as paid/failed) — non-blocking (log and continue if this ack fails, since the payment itself already succeeded).
6. Redirect the browser to `/payment-result?orderId=...&status=...&txnId=...&amount=...&respMsg=...&respCode=...&paymentMode=...&bankName=...` so the frontend can render a result page.
7. Wrap everything in try/catch; on any unexpected error, redirect to `/payment-result?status=FAILED` rather than throwing/hanging.

**Configure this exact URL as the callback/webhook URL in the Paytm dashboard** for the MID, or (as done here) pass it dynamically per-request as `callbackUrl` in the `initiateTransaction` call — both work; this project uses the dynamic per-request approach so it can point at whatever the current Repl's actual host is.

## 4. Frontend flow to replicate (seva.tsx `submitSevas`)

```js
// 1. Validate payee form fields.
// 2. POST /api/initiatePaytmTransaction  { amount: totalSevaAmount, mobile, orderPrefix }
//    orderPrefix = "PS" for recurring sevas, "OTFS" for one-time.
// 3. Get back { txnToken, orderId, mid, amount }. Abort with user-facing error if any field missing.
// 4. POST to your own "create pending booking" endpoint with paymentRef = orderId,
//    status = <pending sentinel>, paymentModeId = 6 (Paytm), plus all booking details.
// 5. sessionStorage.setItem("pendingPayment", JSON.stringify({
//      flowType, itemNames, amount, orderId, ts: Date.now(), retryData: {...}
//    }))
//    -- lets you recover/retry if the tab is closed before redirect completes.
// 6. Build a hidden <form method="POST" action="https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=...&orderId=...">
//    with hidden inputs: mid, orderId, txnToken. Append to body and form.submit()
//    (must be a real form POST — Paytm's hosted page will not accept a fetch/XHR here).
```

A companion `pendingPayment` recovery mechanism (a banner component, checked on app load) reads that `sessionStorage` entry and, if a payment was left in-flight, offers the user a way to check the status or retry — worth replicating if you want resilience against users closing the tab mid-payment.

## 5. `/payment-result` page

A simple client route that reads the query params set by the callback redirect (`status`, `orderId`, `txnId`, `amount`, `respMsg`, etc.) and renders a success/failure/pending UI. No Paytm calls happen here — it's purely a display of the already-verified server-side result.

## 6. Security points worth preserving exactly

- Never trust the raw callback body for the final state — always re-verify via `/v3/order/status` server-side (step 4 above). This is the single most important control against tampering/spoofing.
- Reject callbacks with a missing checksum outright; don't silently treat as "unverified but okay."
- Never accept `mid`/order-status results from the client — all Paytm status checks happen server-side with server-held keys.
- Generate `orderId` server-side (never trust a client-supplied orderId as the one to charge/verify).
- Keep `PAYTM_MERCHANT_KEY`/`PAYTM_MID` (and SPCT variants) as server-only secrets, never exposed to the frontend bundle.
