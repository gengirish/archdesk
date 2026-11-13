---
required_docs:
  - docs/API.md: API endpoint reference
  - docs/SCHEMA.md: database schema reference

related_docs:
  - docs/DEMO.md: stakeholder walkthrough
  - docs/ICP.md: ideal customer profile and plan-tier fit

sources:
  - app/: page routes and layouts
  - app/api/: API route handlers
  - components/: UI and layout components
  - lib/: utility modules and integrations
  - middleware.ts: route protection
  - package.json: dependencies and scripts
---

# ArchDesk — Feature Documentation

> Architecture & Design Project Management SaaS for Tier-2 Indian Cities
>
> Powered by [IntelliForge AI](https://www.intelliforge.tech/)

---

## Overview

ArchDesk is a vertical SaaS platform purpose-built for architecture and interior design firms operating in Tier-2 Indian cities. The first target market is Hubballi-Dharwad, Karnataka.

It replaces the fragmented workflow of WhatsApp groups, Excel sheets, and manual invoicing with a single unified platform covering the full project lifecycle — from lead enquiry to final payment collection.

**Target users:** Firm owners, architects, draftsmen, site managers, and their clients.

---

## Core Modules

### 1. Dashboard (`/dashboard`)

The central command centre for the firm. Shows real-time metrics at a glance.

**Key metrics displayed:**
- Active project count
- Monthly revenue with month-over-month growth percentage
- Pending drawing approvals
- Active leads and pipeline value (in lakhs/crores)
- Overdue milestone alerts

**Additional views:**
- Recent projects list with client name, budget, and current stage
- Revenue summary with trend indicator
- Project stage distribution breakdown (Concept through Completed)
- **Analytics** (`/analytics`, Enterprise): cash-flow KPIs, 12-month revenue vs invoiced, projects by stage/type, lead conversion, top clients, recent activity (uses `GET /api/dashboard/analytics` via TanStack Query)
- **Decision analytics** (`/analytics`, Enterprise): client decision KPIs (last 30 days volume, approval rate, open requests, average response hours)
- **Decision SLA health** (`/analytics`, Enterprise): open decision SLA distribution (healthy, at-risk, breached) for proactive follow-up
- **Decision bottlenecks table** (`/analytics`, Enterprise): top projects ranked by open decision load and response delays, with direct deep links into Billing for action

**API:** `GET /api/dashboard/stats` (summary KPIs), `GET /api/dashboard/analytics` (12-month revenue vs invoiced, stage/type breakdowns, lead conversion, top clients, cash flow, unified activity feed).

---

### 2. Project Management (`/projects`)

Full lifecycle tracking for architecture projects from first sketch to handover.

**Project types supported:**
- Residential
- Commercial
- Industrial
- Interior
- Landscape
- Institutional

**Project stages (sequential):**
1. **Concept** — Initial brief, site analysis, rough sketches
2. **Schematic Design** — Preliminary plans, massing studies
3. **Design Development** — Detailed design, material selections
4. **Working Drawings** — Construction-ready technical drawings
5. **Execution** — Site construction phase
6. **Completed** — Project handed over

**Features:**
- Grid and list view toggle
- Search by project name
- Filter by project type and stage
- Each project card shows: client name, area (sqft), budget (INR), drawing count, milestone count, and location
- Project status tracking: Active, On Hold, Completed, Cancelled
- Team assignment with roles (Lead Architect, Draftsman, etc.)
- Unique client portal token for each project (no login required for clients)

**Data model:**
- Linked to a client and a firm (multi-tenant)
- Tracks budget, area in sqft, start date, deadline, and location
- Has associated drawings, milestones, site updates, and site issues

---

### 3. Client Directory (`/clients`)

Central registry of all clients the firm has worked with or is working with.

**Features:**
- Search by name or phone number
- Client cards showing: name, phone (+91 format), email, city, and project count
- Avatar with initials fallback
- Each client links to their projects

**Data captured:**
- Name, phone (10-digit Indian mobile), email
- Address and city
- Free-text notes
- Associated projects

---

### 4. Drawing Management (`/drawings`)

Upload, version, review, and collaborate on architectural drawings.

**Drawing types:**
- Plan (floor plans, site plans)
- Elevation (front, side, rear views)
- Section (cross-sections)
- Render (3D visualisations)
- BOQ (Bill of Quantities)
- Detail (construction details)
- Other

**Drawing statuses:**
- **Pending Review** — Uploaded, awaiting architect/client review
- **Approved** — Signed off, ready for next stage
- **Revision Requested** — Changes needed, sent back to draftsman

**Features:**
- Blueprint-style preview grid
- Version tracking (v1, v2, v3...)
- File size display
- Comment count per drawing
- Comment system supporting both team members and clients (clients comment via portal without login, identified by name)
- Drawing version history with notes
- **Upload:** The Drawings page uses a file picker and `POST /api/projects/[id]/drawings/upload` (multipart). The server writes to the **`drawings`** Supabase Storage bucket and persists the public URL on the `Drawing` record (not a hand-pasted URL).

**Storage:** Files stored in Supabase Storage with organised buckets (drawings, site-photos, renders, firm-assets).

---

### 5. Milestone Billing (`/billing`)

India-specific billing system tied to project stages, with GST compliance built in.

**Billing model:**
Architecture fees are milestone-based, tied to project stages:
1. Retainer (on signing)
2. Schematic fee
3. Design development fee
4. Working drawings fee
5. Site supervision fees
6. Completion fee

**Features:**
- Summary cards: Total Billed, Collected, Outstanding, Collection Rate (%)
- Collection rate progress bar
- Full milestone table with: name, project, base amount, GST-inclusive amount, and payment status
- Milestone statuses: Upcoming, Due, Unpaid, Paid, Overdue
- Enterprise control to open/close client decision requests per milestone (powers client portal approve/reject inbox)
- URL filter support for decision triage workflows (for example, `/billing?projectId=...&decision=open`)
- Includes a one-click **Nudge client** action for open decision requests (Resend email delivery + WhatsApp provider abstraction with audit log)
- Includes **Decision SLA automation controls** (run scan + auto-nudge breached requests with cooldown) for Owner/Admin on Enterprise

**GST compliance:**
- Default 18% GST on architecture services
- Every amount shows base + GST breakup
- GST amount calculated automatically

**Invoice generation:**
- Auto-generated invoice numbers (e.g., `ARC-2026-001`)
- `POST /api/invoices/generate` creates a `DRAFT` invoice and returns `invoice`, `firm`, `client`, `project`, and `milestone` for client-side PDF rendering
- PDF layout via `@react-pdf/renderer` (`components/invoice-pdf.tsx` — TAX INVOICE, CGST/SGST lines, amount in words)
- Tracks Razorpay payment ID and order ID

**Payments:**
- Razorpay integration with payment link generation
- Supports UPI, cards, and net banking
- SMS + WhatsApp + email payment reminders
- Webhook signature verification for payment confirmation

**Currency formatting:**
- All amounts in INR with Indian numbering system
- `₹1,05,000` (correct) — not `₹105,000` (western)
- Short format for large amounts: `₹3.5L`, `₹1.5Cr`

---

### 6. Leads CRM (`/leads`)

Track potential clients from first contact to project conversion.

**Lead pipeline stages:**
1. **New** — Fresh enquiry received
2. **Contacted** — Initial call/message sent
3. **Site Visit** — Physical site assessment done
4. **Proposal Sent** — Quote/proposal delivered
5. **Negotiation** — Terms being discussed
6. **Won** — Converted to project
7. **Lost** — Did not convert

**Lead sources tracked:**
- Referral
- Instagram
- Facebook
- Walk-in
- Website
- Houzz
- Phone call
- Other

**Features:**
- Kanban board layout (5 active pipeline columns)
- Lead cards showing: name, phone, project type, budget, and source
- Won/Lost sections displayed separately below the pipeline
- Pipeline value calculation (sum of budgets in active stages)
- Activity tracking per lead (calls, emails, WhatsApp messages, site visits, proposals, notes, stage changes)
- Follow-up date tracking
- Lead-to-project conversion linking

---

### 7. Site Tracker (`/site-tracker`)

Daily construction progress logging and issue management for active projects.

**Site Updates:**
- Timeline-style log entries
- Each entry captures: project name, logged-by user, text note, photo count, weather conditions, and current construction milestone
- Photos stored in Supabase Storage

**Site Issues:**
- Severity levels: Low, Medium, High, Critical
- Issue statuses: Open, In Progress, Resolved, Closed
- Fields: title, description, photos, assigned team member, resolved date
- Colour-coded severity indicators

**Use case:** Site managers log daily progress from the construction site. Architects and firm owners review remotely. Issues are tracked to resolution.

---

### 8. Vendor Directory (`/vendors`)

Maintain a rated directory of local contractors, suppliers, and service providers.

**Vendor categories:**
Contractor, Tiles, Steel, Wood, Glass, Electrical, Plumbing, Paint, Hardware, Furniture, Landscaping, Other

**Features:**
- Search by vendor name
- Filter by category
- Vendor cards showing: name, category, phone, city, star rating (1-5)
- GST number tracking for vendors with GST registration
- Notes field for vendor-specific information

**Local focus:** Default city is Hubballi. Covers vendors in Hubballi, Dharwad, Belagavi, Davangere, and Mysuru.

---

### 9. Settings (`/settings`)

Firm profile and brand configuration.

**Firm Profile:**
- Firm name, GST number, phone, email
- Office address and city
- Website URL

**Brand Customisation:**
- Brand colour (default: `#E8A045` — ArchDesk gold)
- Firm logo upload (PNG, SVG)
- Brand settings apply to client portal and PDF invoices

---

### 10. AI Construction Cost Estimator (`/ai-estimator`)

Instant, professional cost estimates for Indian construction projects. The demo moment for investors.

**How it works:**
1. Architect inputs: project type, area (sq ft), quality tier, location, floors, interior toggle
2. Deterministic calculator uses real Indian construction rates and location multipliers
3. Returns detailed cost breakdown with category-wise allocation

**Rate table (per sq ft, INR):**
| Type | Standard | Premium | Luxury |
|------|----------|---------|--------|
| Residential | 1,800–2,200 | 2,500–3,200 | 3,500–5,000 |
| Commercial | 2,200–2,800 | 3,000–4,000 | 4,500–6,500 |
| Interior | 800–1,200 | 1,500–2,200 | 2,500–4,000 |

**Location multipliers:** Mumbai/Delhi 1.3x, Bangalore/Hyderabad 1.15x, Tier-2 cities 1.0x, Rural 0.85x

**Output includes:**
- Grand total with GST (18%)
- 10-category breakdown: Structure (30%), Brickwork (12%), Plumbing (8%), Electrical (8%), Flooring (10%), Painting (7%), Doors & Windows (8%), Kitchen/Bathrooms (7%), Architect Fee (8%), Contingency (2%)
- Optional interior breakdown (false ceiling, modular kitchen, wardrobes, furniture, lighting)
- Timeline estimate based on area
- Assumptions list

**PDF Download:**
- "Download estimate" button generates a professional PDF via `@react-pdf/renderer`
- PDF includes branded header, project inputs grid, cost breakdown table, interior table, GST summary box, assumptions, and footer
- File saved as `ArchDesk-Estimate-{TYPE}-{AREA}sqft.pdf`

**API:** `POST /api/ai/cost-estimate`

---

### 11. 3D Studio (`/3d-studio`)

Floor-plan-to-3D preview module for fast flat visualisation in browser.

**Current MVP capabilities:**
- Project-scoped floor plan records with normalized geometry payload (`planJson`)
- Sample floor plan generation for quick demos
- Direct floor-plan upload (`PDF`, `DXF`, `PNG`, `JPG`, `JPEG`, `WEBP`) with server-side parsing into canonical geometry
- Rule-based scene generation from 2D walls to 3D wall meshes
- Live Babylon.js preview canvas with camera orbit and generated walls/floor
- Scene persistence in database for later editing and export workflows

**Data model additions:**
- `FloorPlan`: canonical 2D shape + source metadata (`MANUAL`, `DXF`, `PDF`, `IMAGE`)
- `FlatScene`: generated 3D payload (`sceneJson`) + generation metadata/status

**API:** `GET/POST /api/projects/[id]/floor-plans`, `POST /api/projects/[id]/floor-plans/upload`, `GET /api/projects/[id]/flat-scenes`, `POST /api/projects/[id]/flat-scenes/generate`

---

### 12. Client Portal (`/portal/[token]`)

Magic-link access for clients to view their project. No app download, no account creation.

**What clients see:**
- Project name, stage, and timeline with current stage highlighted
- Decision requests for milestones with approve/reject actions and mandatory notes
- Recent decision history for transparency
- Milestone payment table with status (Paid/Upcoming/Overdue) and Razorpay payment links
- Approved drawings (only approved — no draft confusion)
- Recent site update photos and notes
- Firm branding (name, logo, brand colour)

**How it works:**
- Each project has a unique `clientToken` (auto-generated cuid)
- Client accesses `/portal/[token]` — no Clerk session needed
- Light theme (client-facing), not the dark dashboard
- Middleware exempts `/portal/*` from auth

**API:** `GET /api/portal/[token]`, `GET /api/portal/[token]/decisions`, `POST /api/portal/[token]/decisions` (public), staff control endpoint `PATCH /api/projects/[id]/milestones/[milestoneId]/client-review`, nudge endpoint `POST /api/projects/[id]/milestones/[milestoneId]/client-nudge`, and automation endpoint `POST /api/automation/decision-sla`

---

### 13. SaaS Plan Tiers

Three-tier business model with feature gating.

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Dashboard | Yes | Yes | Yes |
| Projects | 3 max | Unlimited | Unlimited |
| Clients | 5 max | Unlimited | Unlimited |
| Basic Billing | Yes | Yes | Yes |
| Settings | Yes | Yes | Yes |
| Drawings | — | Yes | Yes |
| Site Tracker | — | Yes | Yes |
| Leads CRM | — | Yes | Yes |
| Vendors | — | Yes | Yes |
| AI Estimator | — | Yes | Yes |
| PDF Invoices | — | Yes | Yes |
| File Uploads | — | Yes | Yes |
| Client Portal | — | — | Yes |
| Multi-user Teams | — | — | Yes |
| Advanced Analytics | — | — | Yes |
| White Label | — | — | Yes |
| API Access | — | — | Yes |

**Implementation:**
- `Firm.plan` field in Prisma schema (`"free"` | `"pro"` | `"enterprise"`, default `"free"`)
- `lib/feature-tiers.ts` — plan hierarchy, feature-to-plan mapping, `hasAccess()`, `getRequiredPlan()`
- `hooks/usePlan.ts` — reads plan from `/api/firm` response
- `components/feature-gate.tsx` — upgrade prompt UI wrapping gated pages
- Plan badges (PRO, AI, ENT) on sidebar navigation

---

## Architecture & Security

### Multi-tenancy
Every database query is scoped to `firmId`. A firm's data is completely isolated from other firms. Clerk manages authentication, and each user belongs to exactly one firm.

### User Roles
| Role | Description |
|------|-------------|
| Owner | Firm owner, full access |
| Architect | Design team member |
| Draftsman | Drawing production |
| Site Manager | On-site construction oversight |
| Admin | Administrative staff |

### Authentication & User Provisioning
- Clerk handles sign-in/sign-up, session management, and user profiles
- Clerk webhook (`/api/webhooks/clerk`) automatically creates Firm + User records on signup
- New users get role `OWNER` and a default firm named `"{Name}'s Firm"`
- All dashboard routes are protected via Clerk middleware
- Public routes: landing page, sign-in, sign-up, client portal, and webhook endpoints
- Reusable auth helper (`lib/auth.ts`): `getAuthUser()` resolves Clerk session to Prisma User + Firm

### Client Portal
Each project has a unique `clientToken` (auto-generated cuid). Clients access their project via `/portal/[token]` without needing a Clerk account. They can view the project timeline, milestone payments, approved drawings, and site update photos. The portal uses a light theme with the firm's brand colour.

### API Design
- RESTful endpoints under `/api/[resource]` with project-scoped nested routes
- Typed responses using `{ data, error }` pattern
- Clerk session validated on every authenticated request
- Firm ownership checked before any read/write
- Zod validation on AI estimator and other complex inputs
- Consistent error handling with `console.error("[ROUTE_NAME]", error)` and 500 responses

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript strict) |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Clerk |
| Database | Prisma ORM + Supabase Postgres |
| File Storage | Supabase Storage |
| Client State | Zustand |
| Server State | TanStack React Query |
| Forms | react-hook-form + Zod |
| Payments | Razorpay (UPI, cards, net banking) |
| Email | Resend |
| PDF | @react-pdf/renderer |
| 3D Rendering | Babylon.js |
| E2E Testing | Playwright + @clerk/testing |
| Hosting | Vercel (primary), Fly.io (Mumbai) |

---

## E2E Test Coverage

47 Playwright tests covering five areas:

| Suite | Tests | What's verified |
|-------|-------|-----------------|
| Landing Page | 8 | Nav, hero, features, Indian market section, footer, navigation |
| Authentication | 5 | Clerk sign-in/sign-up forms render, unauthenticated redirect |
| API Routes | 9 | Public portal behavior (404/rate-limit) + protected endpoint rejection checks including decision SLA automation and floor-plan upload auth guard |
| Dashboard | 8 | Sign-in via API token, sidebar nav, search, user avatar, page navigation |
| Feature Workflows | 11 | Billing and analytics routes render expected enterprise decision controls/insights |

**Run locally:** `npm run test:e2e`
**Run public suites only:** `npm run test:e2e:public`
**Run against production:** `BASE_URL=https://archdesk.vercel.app npm run test:e2e`

Authenticated tests use Clerk Backend API sign-in tokens to bypass 2FA.

---

## Deployment

| Platform | URL | Region |
|----------|-----|--------|
| Vercel (primary) | https://archdesk.vercel.app | Edge (global) |
| Fly.io | https://archdesk.fly.dev | Mumbai (bom) |
| Database | Neon PostgreSQL | US East |
| GitHub | https://github.com/gengirish/archdesk | — |

---

## Indian Market Specifics

| Aspect | Implementation |
|--------|---------------|
| Currency | INR only, Indian numbering (lakhs/crores) |
| Tax | 18% GST (CGST + SGST) on all invoices |
| Dates | DD/MM/YYYY format |
| Phone | +91 prefix, 10-digit validation |
| Payments | Razorpay with UPI as primary method |
| Cities | Hubballi, Dharwad, Belagavi, Davangere, Mysuru |
| Language | English (en-IN locale) |
