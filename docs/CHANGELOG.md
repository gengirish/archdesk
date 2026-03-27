---
related_docs:
  - docs/FEATURES.md: feature changes logged here
  - docs/API.md: API changes logged here
  - docs/SCHEMA.md: schema changes logged here

sources:
  - app/: page route changes
  - app/api/: API route changes
  - prisma/schema.prisma: schema changes
  - components/: component changes
  - lib/: utility changes
  - e2e/: test coverage changes
---

# ArchDesk — Changelog

## 2026-03-27 — Drawings upload (docs & E2E)

- Documented `POST /api/projects/[id]/drawings/upload` (multipart fields, storage path, status codes) in `docs/API.md`; aligned `docs/FEATURES.md` and `docs/DEMO.md` with storage-backed upload from the Drawings UI
- Playwright: unauthenticated guard for drawings multipart upload; authenticated smoke for `#drawing-file` when the drawings feature is unlocked

---

## 2026-03-27 — 3D Studio MVP (floor plan to Babylon preview)

- Added Babylon.js runtime dependencies (`@babylonjs/core`, `@babylonjs/loaders`) and a new dashboard route `/3d-studio`
- Added Prisma models/enums for 3D workflow: `FloorPlan`, `FlatScene`, `FloorPlanSourceType`, `FlatSceneStatus`, and Project relations (`floorPlans`, `flatScenes`)
- Added authenticated project-scoped APIs:
  - `GET/POST /api/projects/[id]/floor-plans`
  - `GET /api/projects/[id]/flat-scenes`
  - `POST /api/projects/[id]/flat-scenes/generate`
- Added generation utility (`lib/flat-scene-generator.ts`) for rule-based v1 scene payload conversion
- Added client integration:
  - `hooks/use3dStudio.ts` for floor plans/scenes mutations & queries
  - `components/three-d/FlatSceneCanvas.tsx` Babylon renderer
  - `app/(dashboard)/3d-studio/page.tsx` MVP UI controls + preview
- Updated docs (`docs/API.md`, `docs/SCHEMA.md`, `docs/FEATURES.md`, `docs/DEMO.md`) for new route, APIs, and schema
- Fixed Playwright public config mismatch by adding a `setup-public` project and dependency chain so Clerk setup runs before `auth.spec.ts` in `test:e2e:public`
- Added concrete Cursor multi-agent execution plan at `docs/MULTI_AGENT_IMPLEMENTATION.md` with agent topology, branch strategy, ownership boundaries, merge protocol, and ready-to-run prompts
- Added v1 integration contract docs under `docs/contracts/` (`floor-plan-json`, `flat-scene-json`, `cost-delta-api`, `portal-options-api`) for contract-first parallel delivery
- Hardened 3D Studio contract enforcement in API/generator flow: `schemaVersion` normalization, geometry validation, and explicit 400/422 responses for invalid floor-plan payloads
- Expanded E2E baseline for Phase 0 alignment: added authenticated `/3d-studio` smoke test and unauthenticated checks for new 3D Studio APIs

---

## 2026-03-27 — Decision SLA automation, CI hardening & analytics

### Decision SLA automation
- Added enterprise Decision SLA automation endpoint `POST /api/automation/decision-sla` with dry-run and execute modes, configurable breach thresholds (default 48h), and nudge cooldown controls (default 24h)
- Added `lib/decision-sla.ts` helpers: `classifyDecisionSla()` (HEALTHY / AT_RISK / BREACHED), `isNudgeCooldownComplete()`, `hoursSince()`
- Added Billing UI controls: "Run SLA scan" (dry run) and "Auto-nudge breached" buttons for Owner/Admin on Enterprise plan
- Extended analytics API with `slaHealth` counts (`healthy`, `atRisk`, `breached`) for currently open decision requests
- Added SLA health distribution card in Analytics under Client Decision Insights

### CI & release hardening
- Added GitHub Actions workflow `.github/workflows/ci.yml` with two jobs: `verify` (install, Prisma generate, typecheck, lint, build) and `e2e_public` (Chromium smoke tests)
- Added non-interactive ESLint config `.eslintrc.json` (`next/core-web-vitals`)
- Added dedicated public Playwright config `playwright.public.config.ts` (no Clerk setup dependency)
- Added release guardrail scripts: `typecheck`, `test:e2e:public`
- Added Node runtime parity: `engines` constraint in `package.json` and `.nvmrc` pinned to 20

### E2E test coverage
- 42 Playwright tests: 22 public (landing, auth, API) + 20 authenticated (dashboard, features)
- Fixed rate-limit test to be resilient to serverless cold starts (accepts 404 or 429)
- Added unauthenticated protection test for `POST /api/automation/decision-sla`
- Added `E2E_CLERK_USER_EMAIL` / `E2E_CLERK_USER_PASSWORD` to `.env.example`
- All 42 tests passing against https://archdesk.vercel.app

---

## 2026-03-26 — Client decision portal (phase 1)

- Added `ClientDecision` model and `ClientDecisionOutcome` enum to Prisma schema, plus `Milestone.clientDecisionOpen` toggle and related indexes
- Added staff endpoint `PATCH /api/projects/[id]/milestones/[milestoneId]/client-review` to open/close milestone decision collection
- Added public portal decision APIs: `GET /api/portal/[token]/decisions` and `POST /api/portal/[token]/decisions` with token-scoped validation and transactional close-on-submit logic
- Extended portal UI (`/portal/[token]`) with decision inbox, approve/reject form, and recent decision history
- Replaced Billing page milestone table from mock data to live API data and added per-milestone toggle controls for decision request lifecycle
- Added portal decision POST hardening: enterprise gating, request rate limiting (429 + `Retry-After`), and optional `Idempotency-Key` replay support
- Added E2E coverage for portal decisions not-found/rate-limit behavior and billing visibility of client-decision controls
- Added analytics `decisionInsights` aggregation and dashboard card (approval rate, open requests, avg response hours, 30-day decision counts)
- Added `decisionInsights.bottlenecksByProject` aggregation and analytics table to spotlight delayed client decisions by project
- Added analytics-to-billing deep links and billing URL filters (`projectId`, `decision=open`) for faster decision triage
- Added enterprise-only `POST /api/projects/[id]/milestones/[milestoneId]/client-nudge` stub and Billing “Nudge client” action for open decision requests
- Wired real email nudges via Resend and added `ClientNudge` persistence model for channel/status/provider auditability
- Added WhatsApp nudge provider abstraction path (current default provider is queued stub) with unified delivery status handling
- Added `Milestone.clientDecisionOpenedAt` for accurate decision response-time tracking
- Updated docs (`docs/API.md`, `docs/SCHEMA.md`, `docs/FEATURES.md`) to reflect new schema, endpoints, and portal flow

---

## 2026-03-24 — Demo-ready environment & plan tier fix

### Demo Environment
- Expanded seed script with all 5 user roles (OWNER, ARCHITECT, DRAFTSMAN, SITE_MANAGER, ADMIN), 8 clients, 10 projects, 20 milestones, 14 invoices, 12 drawings with version history, 13 drawing comments (team + client), 12 leads across all pipeline stages, 15 lead activities, 8 vendors, 10 site updates, 6 site issues
- Created real Clerk accounts for all 5 demo roles with email/password login for persona-based demos
- Seed script now uses real Clerk IDs by default (override via env vars)

### Plan Tier Fix
- Added `plan` field to `Firm` model in Prisma schema (`@default("free")`)
- Fixed `usePlan()` hook — was hardcoded to `"free"`, now reads plan from `/api/firm` response
- Demo firm seeded as `"enterprise"` so all features are unlocked for demos

### PDF Estimate Download
- Created `components/estimate-pdf.tsx` — professional PDF layout with branded header, project inputs grid, construction cost breakdown table, interior fit-out table, summary box with GST, assumptions section, and footer
- Wired "Download estimate" button on `/ai-estimator` to generate PDF via `@react-pdf/renderer` `pdf().toBlob()` (replaces placeholder)
- Downloads as `ArchDesk-Estimate-{TYPE}-{AREA}sqft.pdf`

---

## 2026-03-24 — Placeholder elimination (all 17 placeholders resolved)

### Wave 1 — Wire list pages to live data
- Projects, Clients, Leads, Vendors pages now use TanStack Query hooks instead of hardcoded mock arrays
- Drawings page aggregates across all projects via `useQueries` (new `hooks/useDrawings.ts`)
- Billing page fetches milestones across all projects (new `hooks/useBilling.ts`)
- Site Tracker page fetches site updates across all projects (new `hooks/useSiteTracker.ts`)
- All pages have proper loading spinners and error states

### Wave 2 — Create/Add forms with mutations
- **New Project** dialog on `/projects` — form with client dropdown, project type select, budget, area, location; uses `useCreateProject` mutation
- **Upload Drawing** dialog on `/drawings` — project select, name, type, file URL; inline mutation to project-scoped drawings API
- **Add Client** dialog on `/clients` — name, phone, email, city; uses `useCreateClient` mutation
- **Add Vendor** dialog on `/vendors` — name, category, phone, email, city, GST; uses `useCreateVendor` mutation
- **Add Lead** dialog on `/leads` — name, phone, source, project type, budget; uses `useCreateLead` mutation
- **Log Update** dialog on `/site-tracker` — project select, note, weather, milestone; inline mutation
- **Settings** `/settings` fully wired — loads firm data via `GET /api/firm`, saves via `PATCH /api/firm`, controlled form inputs, brand color preview, logo file input
- All forms show success/error toasts via Sonner

### Wave 3 — Global UX + Feature Gating
- **Global search** command palette (⌘K) in TopBar — searches across Projects, Clients, Leads with navigation
- **Notifications dropdown** on bell icon — fetches recent activity from analytics API, shows relative timestamps
- **Feature gate enforcement** on 5 Pro pages (Drawings, Site Tracker, Leads, Vendors, AI Estimator) using `FeatureGate` component
- New `hooks/usePlan.ts` — returns current plan tier from `/api/firm` response

### Wave 4 — Analytics + Cleanup
- **Analytics page** `/analytics` — cash flow summary, 12-month revenue bars, projects by stage/type, lead conversion rate, top clients table, recent activity feed
- Added Analytics to sidebar with enterprise-tier gating
- New `hooks/useAnalytics.ts` for dashboard analytics data
- Wired Zustand `newProjectOpen` store state to projects dialog (replacing local useState)
- Drawing cards show real image previews from `fileUrl` with graceful fallback to blueprint placeholder

---

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
- Client directory (`/clients`) and vendor directory (`/vendors`) use `useClients` / `useVendors` with centered loading spinners (replaced page-level mock arrays)
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
