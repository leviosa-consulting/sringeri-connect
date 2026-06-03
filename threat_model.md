# Threat Model

## Project Overview

Sringeri App is a public internet-facing devotee services portal built with a React frontend, an Express backend, Firebase Authentication, PostgreSQL, and several upstream integrations including Sringeri's external API and Paytm. The production deployment serves both public surfaces and authenticated devotee/admin workflows from the same application.

## Assets

- **Devotee accounts and identity** — Firebase identities, UID mappings, and the profile data fetched from the Sringeri backend. Compromise can expose personal data or let an attacker act as another devotee.
- **Payment and booking state** — donation, seva, fastline, accommodation, and reconciliation order records. Tampering can create false receipts, missed acknowledgements, fake bookings, or availability loss.
- **Admin capabilities** — launch controls, analytics, support inbox, quiz management, and reconciliation tools. Abuse can take the app offline, expose devotee data, or manipulate payment follow-up flows.
- **Sensitive devotee data** — names, email addresses, phone numbers, address details, support messages, quiz history, and transaction history returned by the upstream Sringeri API or local database.
- **Application secrets and trust links** — Paytm merchant keys, database credentials, Firebase admin access, and the server-side trust relationship with `dsspv2.lcpl.in`.

## Trust Boundaries

- **Browser / Express API** — all client input is untrusted, even when the UI normally hides a feature behind login.
- **Express / Firebase Admin** — Firebase ID tokens must be cryptographically verified before any action is tied to a UID or role.
- **Express / Sringeri upstream API** — this backend is trusted to send authenticated, validated requests to the upstream devotional services API.
- **Express / Paytm** — payment callbacks and status checks cross a high-risk boundary and must be verified before changing booking or donation state.
- **Public / Authenticated / Admin surfaces** — public content, devotee-only operations, and admin-only tools share one app and must be separated server-side.
- **Production / Dev-only code** — `server/`, `client/src/`, and `shared/` are production-relevant. `artifacts/mockup-sandbox/` and `attached_assets/` are archive or dev-only unless a live route proves otherwise.

## Scan Anchors

- Production server entry point: `server/index.ts`
- Main API surface and auth/payment logic: `server/routes.ts`
- Persistent storage and admin/reporting data access: `server/storage.ts`, `shared/schema.ts`
- Client auth/session flows: `client/src/contexts/auth-context.tsx`, `client/src/lib/firebase.ts`
- Public payment callback and reconciliation paths: `/api/paytm-callback`, `/api/*Paytm*`, `/api/admin/reconciliation*`
- Launch/admin surfaces: `/api/launch`, `/api/launch/reset`, `/api/admin/*`, client admin pages under `client/src/pages/admin-*`
- Dev-only areas usually out of scope: `artifacts/mockup-sandbox/`, legacy files under `attached_assets/`

## Threat Categories

### Spoofing

This project relies on Firebase tokens to identify both devotees and admins. Any route that accepts a bearer token must verify the signature and derive the acting UID from the verified token, not from decoded but unverified JWT payloads or client-supplied IDs. Paytm callbacks must also prove they came from Paytm before the app treats a payment as real.

### Tampering

Booking, donation, reconciliation, and profile update routes accept rich client input and forward it to upstream services. The server must enforce ownership, role checks, and business rules itself so attackers cannot tamper with order IDs, devotee IDs, booking details, or payment state by calling API routes directly.

### Information Disclosure

The backend proxies devotee profiles, transaction histories, support messages, quiz records, and analytics. Responses must be scoped to the authenticated user or admin, and production logs and error messages must not leak PII, tokens, or internal upstream responses beyond what is operationally required.

### Denial of Service

Public routes that trigger upstream work, payment initialization, reservation creation, chat handling, or database writes can be abused to create cost or availability issues. Sensitive callback and booking routes must resist unauthenticated spam, and operations that reserve scarce resources must not be reachable without the intended server-side checks.

### Elevation of Privilege

Admin-only features include launch control, analytics, reconciliation, support inboxes, and quiz management. The system must enforce these privileges on the server, using verified identities and non-public role configuration, so regular visitors cannot promote themselves, toggle launch state, access admin data, or perform payment acknowledgements.