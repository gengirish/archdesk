# ArchDesk — Changelog

## 2026-03-24 — YC-ready feature buildout

### Foundation
- Added Clerk webhook (`/api/webhooks/clerk`) for automatic Firm + User provisioning on signup
- Created reusable auth helper (`lib/auth.ts`) — `getAuthUser()` / `requireAuth()`
- Built complete CRUD API layer: 16 endpoints (up from 2)
  - Clients, Leads (with conversion), Vendors, Drawings, Milestones, Site Updates, Firm Settings, Dashboard Stats, Dashboard Analytics, Invoice Generation
- Added Prisma seed script (`prisma/seed.ts`) with realistic Hubballi demo data (firm, 6 clients, 8 projects, 18 milestones, 5 invoices, 8 drawings, 10 leads, 6 vendors)
- Created TanStack React Query hooks for all resources (`useClients`, `useLeads`, `useVendors`, `useDashboard`)

### YC Differentiators
- **AI Construction Cost Estimator** (`/ai-estimator`) — deterministic calculator with real Indian construction rates per sq ft, location multipliers, quality tiers, GST, detailed category breakdown, timeline estimate
- **Client Portal** (`/portal/[token]`) — magic-link access for clients, project timeline, milestone payment status, approved drawings, site update photos. No login required
- **GST Invoice PDF Generation** — `@react-pdf/renderer` TAX INVOICE with CGST/SGST split, amount in words, firm branding. Auto invoice numbering
- **Dashboard Analytics API** — 12-month revenue trends, project distribution, lead conversion rate, cash flow projections, top clients, unified activity timeline

### SaaS Business Model
- Added 3-tier plan system (Free / Pro / Enterprise) adapted from interview-with-giri patterns
- Feature gate component with upgrade prompt
- Plan-gated sidebar navigation with PRO and AI badges
- Plan limits: Free (3 projects, 5 clients), Pro (unlimited), Enterprise (portal + teams + analytics)

### Architecture Improvements
- Wired dashboard page to real API data with loading skeletons (replaced mock data)
- Lead-to-project one-click conversion (creates Client + Project + auto stage change)
- Consistent `{ data, error }` API response envelope across all routes
- All queries firm-scoped for multi-tenant isolation

### Deployment Fix
- Fixed CSS not loading on Vercel: converted `postcss.config.mjs` to `.js` (CommonJS), installed missing `autoprefixer`, removed unnecessary `output: "standalone"`

---

## 2026-03-24 — E2E testing and documentation setup

- Added Playwright E2E test suite with 26 tests (landing page, auth, API security, authenticated dashboard)
- Integrated `@clerk/testing` with Backend API sign-in tokens to bypass 2FA in tests
- Added `/` to public routes in middleware so landing page is accessible without auth
- Added `test:e2e`, `test:e2e:headed`, `test:e2e:ui` scripts to package.json
- All 26 tests passing against production (https://archdesk.vercel.app)
- Created `docs/API.md` — API endpoint reference
- Created `docs/SCHEMA.md` — database schema quick-reference
- Created `docs/CHANGELOG.md` — this file
- Created `.cursor/skills/archdesk-docs/` — living documentation skill

## 2026-03-23 — Neon DB, Clerk auth, and deployment

- Initialized git repository
- Connected Neon PostgreSQL database (17 tables created)
- Configured Clerk authentication with test keys
- Deployed to Vercel (https://archdesk.vercel.app) and Fly.io (https://archdesk.fly.dev)
- Set DATABASE_URL, DIRECT_URL, and Clerk keys on both platforms
- Installed official Clerk Cursor skills (10 skills)
- Created ArchDesk-specific Clerk skill (`.cursor/skills/clerk-archdesk/`)

## 2026-03-23 — Initial commit

- ArchDesk SaaS platform for architecture firms
- Next.js 14 App Router with TypeScript
- Prisma schema with 15 models and 14 enums
- 10 dashboard pages (all using mock data)
- 2 API routes (projects CRUD with Clerk auth)
- Clerk middleware protecting all dashboard routes
- Landing page with feature showcase and India-specific section
- shadcn/ui component library
- Tailwind CSS dark theme
