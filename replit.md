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
- Donation flow uses `/api/makeDonation` endpoint with CCAvenue payment gateway (fallback to Razorpay if orderId returned)
- Donation APIs: donationHeading, donationCategory, donationSubCategory, postageOptionsDonation, calendarTypes, tithis, chandraMasas, souraMasas, nakshatras, devoteeKarta, devoteeAddress
- Seva Booking APIs: centres, online/deities/:sevaTypeId, online/deitySevas/:sannidhiId/:sevaTypeId, online/sevaAvailability/:dsId, onlineFrequentSevas, rashis, postageOptions, recurrenceTypes, recurranceCount (multi-param), online/fl (POST for payment)
- Seva flow uses `/api/online/fl` POST endpoint with Razorpay payment gateway
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