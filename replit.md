# Sringeri App

## Overview

A mobile-first web application serving as the official digital services portal for Sri Sringeri Sharada Peetham devotees. The app provides seva bookings, donations, accommodation reservations, event information, and devotee community features. Built as a full-stack TypeScript application with React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for auth state and font size preference
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration
- **Responsive Breakpoint**: Desktop layout activates at `lg:` (1024px+); below 1024px shows mobile layout with bottom nav. This ensures iPad portrait (768-810px) gets the mobile experience. Mobile content uses `max-w-lg sm:max-w-2xl` for proper tablet width.

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **API Pattern**: REST API acting as a proxy to external Sringeri API (`dsspv2.lcpl.in`)
- **Development**: Vite dev server with HMR integrated into Express for development mode
- **Production**: Static file serving from compiled Vite output

### Authentication
- **Provider**: Firebase Authentication
- **Methods**: Email/password and Google OAuth sign-in
- **Token Flow**: Firebase ID tokens passed to backend, then forwarded to external Sringeri API
- **Session Management**: Client-side via Firebase Auth state observer
- **Public Pages**: `/fastline` accessible without login (standalone Fastline seva booking)

### Subdomain Routing
- **Fastline Subdomain**: Requests with `Host: fastline.*` are redirected to `/fastline`
- Middleware in `server/index.ts` handles detection; API and asset paths pass through
- Enables future custom domain support (e.g., `fastline.sringeri.net`)

### Launch Gate
- **Table**: `app_settings` stores key-value pairs; `isLaunched` key controls the gate
- **Pre-launch**: All routes show a "Coming Soon" page with logo, except `/admin/launch` (admin launch control) and `/fastline` (standalone seva booking)
- **Admin launch page**: `/admin/launch` — admin logs in, clicks launch button → sets `isLaunched=true` in DB → app opens to all visitors
- **Admin check**: Uses `ANALYTICS_ADMIN_UIDS` env var for both backend and frontend (via `VITE_ANALYTICS_ADMIN_UIDS`)
- **Post-launch**: `LaunchGate` component in `App.tsx` checks `/api/launch-status` and renders full router when launched
- **APIs**: `GET /api/launch-status` (public), `POST /api/launch` (admin-only)

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Current Schema**: Basic users table (id, username, password)
- **In-Memory Fallback**: MemStorage class for development without database
- **Migrations**: Drizzle Kit with `db:push` command

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components including shadcn/ui
│   │   ├── contexts/     # React contexts (auth)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities, Firebase config, constants
│   │   └── pages/        # Route page components
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── chatbot.ts    # Rule-based chatbot with API data cache
│   ├── storage.ts    # Data storage abstraction
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared TypeScript types and schema
└── migrations/       # Drizzle database migrations
```

### Build System
- **Client Build**: Vite produces static assets to `dist/public`
- **Server Build**: esbuild bundles server to `dist/index.cjs`
- **Dependencies Bundling**: Selective bundling of server dependencies to reduce cold start times

## External Dependencies

### Firebase Services
- Firebase Authentication for user sign-in
- Requires environment variables: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

### Sringeri External API
- Base URL configured via `VITE_SRINGERI_API_URL` (defaults to `https://dsspv2.lcpl.in`)
- Optional API key via `SRINGERI_API_KEY`
- Backend proxies requests to fetch user profiles, devotee data, accommodation inventory/booking, donation data/payment, and seva booking data
- Donation APIs: donationHeading, donationCategory, donationSubCategory, postageOptionsDonation, calendarTypes, tithis, chandraMasas, souraMasas, nakshatras, devoteeKarta, devoteeAddress
- Donation flow uses Paytm JS Checkout (same as Fastline):
  1. `/api/makeDonation` POST — generates DON_ orderId, picks Paytm credentials (SPCT for 80G, regular for non-80G), calls Paytm Initiate Transaction API, forwards to Sringeri API, returns `{txnToken, orderId, mid, amount}`
  2. Frontend loads Paytm SDK dynamically using returned `mid`, opens inline checkout
  3. `/api/paymentAck` POST — forwards Paytm response to Sringeri API
  4. `/api/verifyPaytmTransaction` POST — server-side verification with conditional SPCT/regular credentials based on `is80G` flag
- Accommodation APIs: onlineInventory, govtIdTypes, checkReservationAadhaar/:aadhaar/:date
- Accommodation booking flow uses Paytm JS Checkout:
  1. `/api/onlineReservationPtm` POST — generates YATRI_ orderId, uses regular Paytm credentials, calls Paytm Initiate Transaction API, forwards reservation data (with orderId) to Sringeri `onlineReservationPtm`, returns `{txnToken, orderId, mid, amount}` where amount = rent + deposit
  2. Frontend loads Paytm SDK dynamically, opens inline checkout
  3. `/api/paymentAck` POST — forwards Paytm response to Sringeri API
  4. `/api/verifyPaytmTransaction` POST — server-side verification with regular credentials
- Seva Booking APIs: centres, online/deities/:sevaTypeId, online/deitySevas/:sannidhiId/:sevaTypeId, online/sevaAvailability/:dsId, onlineFrequentSevas, rashis, postageOptions, recurrenceTypes, recurranceCount (multi-param), online/fl (POST for payment)
- Fastline seva flow uses Paytm JS Checkout (both standalone `/fastline` page AND "Today" section in `/seva` page share the same flow):
  1. `/api/initiatePaytmTransaction` POST — generates FL_ orderId, calls Paytm Initiate Transaction API, returns txnToken
  2. `/api/newReceiptFl` POST — creates DB receipt with form data (devoteeName, devoteeNameK, totalAmount, paymentModeId=6, mobile, city, cityK, receiptTypeId, inAbsentia, branchId, addedAt, status=8, paymentRef=orderId, selectedSevas)
  3. Paytm JS Checkout opens inline for payment
  4. `/api/paymentAck` POST — forwards Paytm response (uppercase keys: BANKNAME, BANKTXNID, CURRENCY, PAYMENTMODE, ORDERID, RESPCODE, RESPMSG, STATUS, TXNDATE, TXNID, TXNAMOUNT) to Sringeri API
  5. `/api/verifyPaytmTransaction` POST — server-side verification (non-blocking)
  6. Success screen shows Transaction ID, Order ID, Amount, and list of booked sevas
- Both Fastline UIs include auto-transliteration of Karta Name and City to Kannada via `/api/transliterate`
- Requires `PAYTM_MID`, `PAYTM_MERCHANT_KEY` (regular) and `PAYTM_MID_SPCT`, `PAYTM_MERCHANT_KEY_SPCT` (80G donations) environment secrets
- One-time and Recurring seva types now use Paytm JS Checkout (Razorpay removed):
  1. `/api/initiatePaytmTransaction` POST — generates PS_ (recurring) or OTFS_ (one-time) orderId via `orderPrefix` param, calls Paytm Initiate Transaction API, returns `{txnToken, orderId, mid, amount}`
  2. `/api/newReceiptFlr` POST (both recurring and one-time) — creates DB receipt with cart data (paymentRef=orderId, selectedSevas, inAbsentia=1 for recurring)
  3. Paytm JS Checkout opens inline for payment
  4. `/api/paymentAck` POST → `/api/verifyPaytmTransaction` POST (non-blocking)
  5. Success screen shows Transaction ID, Order ID, Amount, and list of booked sevas
- Recurring seva features: auto-generated remarks based on recurrence pattern, mutual exclusion of tithi/nakshatra/weekday, Guru Bhikshavandanam (dsId=59) cap at ₹25,00,000 for lifetime daily, noEnd→toDate=9999-12-31, masaId maps to chandraMasaId (calType=2) or souraMasaId (calType=3)
- Three seva types: Fastline (id=1, today's sevas), One-time (id=2, future date with calendar), Recurring/Puduvattu (id=3, recurring with calendar type and recurrence patterns)

### Chatbot (Sringeri Sahayak)
- Rule-based chatbot — no AI/LLM, only verified data from Sringeri APIs
- Backend caches API responses (donations, accommodation, panchanga, events, announcements) with 30-min TTL
- Keyword/intent matching maps user questions to cached data topics
- Frontend widget with markdown rendering, quick-reply buttons, and navigation actions
- User preference: avoid OpenAI/LLM due to risk of unverified information

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Uses `connect-pg-simple` for session storage capability
- Drizzle ORM for type-safe database operations

### UI Dependencies
- Radix UI primitives for accessible components
- Lucide React for icons
- Embla Carousel for carousel components
- date-fns for date formatting
- Recharts for analytics dashboard charts
- react-markdown for rendering markdown content (quiz descriptions)

### Analytics Tracking
- Lightweight client-side tracking module (`client/src/lib/analytics.ts`) captures page views, clicks, scroll depth, and time spent
- Events batched in memory, flushed every 10 seconds or on page unload via `navigator.sendBeacon`
- Session ID generated per browser session (stored in sessionStorage)
- `AnalyticsProvider` context wraps the app inside `AuthProvider`, tracks route changes via wouter
- Global click listener captures interactions on elements with `data-testid`, buttons, and links
- PostgreSQL tables: `analytics_events` (raw events) and `analytics_daily_summary` (aggregated stats)
- Performance indexes on `analytics_events` for `(event_type, created_at)`, `(page, event_type, created_at)`, `(created_at)`, `(session_id, created_at)`
- Admin dashboard at `/analytics` — protected by `ANALYTICS_ADMIN_UIDS` / `VITE_ANALYTICS_ADMIN_UIDS` env vars (comma-separated Firebase UIDs)
- Backend verifies Firebase ID tokens (JWT decode + expiry + audience check) for admin endpoints
- Dashboard shows: overview cards, daily trend chart, page breakdown table, top clicked elements bar chart, live session count, manual aggregation button
- Tracking API: `POST /api/analytics/events` (no auth, max 100 events/batch)
- Dashboard APIs: `GET /api/analytics/summary`, `GET /api/analytics/page-stats`, `GET /api/analytics/top-elements`, `GET /api/analytics/live`, `POST /api/analytics/aggregate` (all admin-only)

### Knowledge Corner (Daily Quiz)
- PostgreSQL tables: `quizzes` (title, subtitle, description, videoUrl, audioUrl, imageUrls, publishDate, isActive), `quiz_questions` (questionText, options JSON, correctCount, sortOrder), `quiz_attempts` (odUserId, score, totalQuestions, answers JSON, completedAt)
- Unique index on `quiz_attempts(odUserId, quizId)` prevents duplicate submissions
- Admin access: `QUIZ_ADMIN_UIDS` env var (falls back to `ANALYTICS_ADMIN_UIDS`); frontend uses `VITE_QUIZ_ADMIN_UIDS` (falls back to `VITE_ANALYTICS_ADMIN_UIDS`)
- User page at `/knowledge` — shows today's quiz with content (markdown, video, audio, image gallery), multi-step quiz flow, results with answer review, and score history tab
- Admin page at `/admin/quizzes` — full CRUD for quizzes and questions with bulk question save
- Quiz scoring: 1 point per question (all-or-nothing); radio for single answer, checkboxes for multi-answer
- Submit endpoint returns 409 if already attempted (dedup via unique index)
- User APIs: `GET /api/quiz/today`, `POST /api/quiz/:id/submit`, `GET /api/quiz/history`, `GET /api/quiz/gamification` (all require Firebase auth)
- Admin APIs: `GET/POST /api/admin/quizzes`, `GET/PUT/DELETE /api/admin/quizzes/:id`, `PUT /api/admin/quizzes/:id/questions/bulk` (admin-only)
- Navigation: "Knowledge" tab in both mobile bottom nav and desktop sidebar

### Gamification (Streaks & Badges)
- PostgreSQL table: `user_badges` (odUserId, badgeId, earnedAt) with unique index on `(odUserId, badgeId)`
- Streak computed from IST-converted attempt dates (using `AT TIME ZONE 'Asia/Kolkata'`); consecutive-day counting from today/yesterday backward
- 7 badges: first_steps (1st quiz), perfect_score (100%), week_warrior (7-day), fortnight_scholar (14-day), month_master (30-day), quiz_explorer (10 quizzes), knowledge_seeker (25 quizzes)
- Badges awarded on quiz submit AND self-healed on gamification endpoint read (covers backfill and transient failures)
- Frontend: flame icon streak counter in Knowledge page header; badges grid on My Scores tab; post-submit celebration with bouncing animation for new badges
- Optimized queries: `hasUserPerfectScore` (COUNT where score=totalQuestions), `getUserAttemptCount` (COUNT), `getUserAttemptDates` (IST DATE extraction)

### Account Deletion (App Store Compliance)
- `DELETE /api/account` endpoint: requires Firebase auth, deletes quiz_attempts, user_badges, and analytics_events for the user
- Frontend: "Delete Account" button on profile page below Sign Out, with AlertDialog confirmation
- Flow: server-side data deletion → localStorage avatar removal → Firebase Auth user deletion via `deleteUser()`
- Handles `auth/requires-recent-login` error gracefully with user-facing message