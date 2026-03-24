# Sringeri App

## Overview

Sringeri App is a mobile-first web application designed as the official digital services portal for devotees of Sri Sringeri Sharada Peetham. Its core purpose is to provide a comprehensive suite of online services including seva bookings, donation facilities, accommodation reservations, event information, and features to foster a devotee community. The project aims to enhance the accessibility of Sringeri Peetham's services globally, leveraging modern web technologies to create a seamless and engaging user experience. The application is built as a full-stack TypeScript application, utilizing React for the frontend and Express.js for the backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for lightweight navigation.
- **State Management**: TanStack React Query for server state; React Context for authentication and global preferences.
- **Styling**: Tailwind CSS v4 integrated with shadcn/ui (New York style) for a consistent and modern UI.
- **Responsiveness**: Mobile-first design, with a bottom navigation bar for screens under 1024px, transitioning to a desktop layout for larger viewports.

### Backend
- **Framework**: Express 5 on Node.js.
- **API Pattern**: REST API primarily functioning as a proxy for the external Sringeri API (`dsspv2.lcpl.in`).
- **Development**: Vite development server integrated with Express for Hot Module Replacement (HMR).
- **Production**: Serves static files compiled by Vite.

### Authentication
- **Provider**: Firebase Authentication supporting email/password, Google OAuth, and Apple Sign-In.
- **Token Flow**: Firebase ID tokens are passed to the backend and then to the external Sringeri API for secure transactions.
- **Session Management**: Client-side through Firebase Auth state observer.
- **Public Access**: Specific sections like `/fastline` are accessible without requiring authentication.

### Subdomain Routing
- Implements middleware for dynamic subdomain handling, e.g., `fastline.*` redirects to `/fastline`, enabling future custom domain support.

### Launch Gate
- A "Coming Soon" gate controlled by an `isLaunched` flag in the `app_settings` database table.
- An admin interface at `/admin/launch` allows authorized users to toggle the application's public availability.

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: Defined in `shared/schema.ts`, including basic user data.
- **Development Fallback**: `MemStorage` class provides in-memory storage for development without a database.
- **Migrations**: Managed using Drizzle Kit.

### Project Structure
- **`client/`**: React frontend components, contexts, hooks, utilities, and pages.
- **`server/`**: Express backend including entry point, API routes, chatbot logic, storage abstraction, and Vite integration.
- **`shared/`**: Contains shared TypeScript types and database schema.
- **`migrations/`**: Drizzle database migration scripts.

### Build System
- **Client**: Vite for bundling frontend assets into `dist/public`.
- **Server**: esbuild for bundling the server to `dist/index.cjs`, with selective dependency bundling for cold start optimization.

### Features
- **Chatbot (Sringeri Sahayak)**: A rule-based chatbot providing verified information from Sringeri APIs, with cached responses and a frontend widget. This is not an AI/LLM based chatbot.
- **Analytics Tracking**: Lightweight client-side tracking of user interactions, batched and sent to the backend. Admin dashboard for viewing aggregated analytics.
- **Knowledge Corner (Daily Quiz)**: Daily quiz feature with questions, multimedia content, and score tracking. Includes an admin interface for quiz management and user history.
- **Gamification**: Implements streaks and badges based on quiz participation and performance, with real-time updates and celebratory animations.
- **Account Deletion**: Provides a mechanism for users to delete their account and associated data in compliance with app store policies.

## External Dependencies

### Firebase Services
- **Firebase Authentication**: Used for all user authentication processes.
- **Environment Variables**: Requires `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`.

### Sringeri External API (`dsspv2.lcpl.in`)
- **Purpose**: Proxied by the backend to handle core functionalities like user profiles, devotee data, accommodation bookings, donations, and seva bookings.
- **Base URL**: Configured via `VITE_SRINGERI_API_URL`.
- **API Key**: Optional, via `SRINGERI_API_KEY`.
- **Specific APIs**:
    - **Donation**: `donationHeading`, `donationCategory`, `donationSubCategory`, `postageOptionsDonation`, calendar/tithi/masa/nakshatra APIs, `devoteeKarta`, `devoteeAddress`.
    - **Accommodation**: `onlineInventory`, `govtIdTypes`, `checkReservationAadhaar`.
    - **Seva Booking**: `centres`, `online/deities/:sevaTypeId`, `online/deitySevas/:sannidhiId/:sevaTypeId`, `online/sevaAvailability/:dsId`, `onlineFrequentSevas`, `rashis`, `postageOptions`, `recurrenceTypes`, `recurranceCount`, `online/fl` (for payment).

### Paytm Payment Gateway
- **Integration**: Used for processing payments for donations, accommodation, and seva bookings in redirect mode.
- **API Calls**: `makeDonation`, `onlineReservationPtm`, `initiatePaytmTransaction`.
- **Callback**: `POST /api/paytm-callback` handles payment responses, server-side verification, and redirects.
- **Environment Secrets**: Requires `PAYTM_MID`, `PAYTM_MERCHANT_KEY` (regular), and `PAYTM_MID_SPCT`, `PAYTM_MERCHANT_KEY_SPCT` (for 80G donations).

### Database
- **PostgreSQL**: Primary data store, configured via `DATABASE_URL`.
- **Session Storage**: `connect-pg-simple` used for storing session data.

### UI Libraries
- **Radix UI**: Provides accessible UI primitives.
- **Lucide React**: Icon library.
- **Embla Carousel**: For carousel components.
- **date-fns**: For date manipulation and formatting.
- **Recharts**: For rendering charts in the analytics dashboard.
- **react-markdown**: For rendering Markdown content (e.g., quiz descriptions).