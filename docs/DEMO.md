---
required_docs:
  - docs/FEATURES.md: features referenced in demo script

sources:
  - app/(dashboard)/: dashboard page routes
  - app/portal/: client portal routes
  - components/layout/: navigation and layout
---

# ArchDesk — Demo Walkthrough

> A guided tour of ArchDesk for stakeholders, investors, and early users.
>
> **Persona:** You are Arjun Deshpande, the owner of "DesignCraft Studios" — a 5-person architecture firm in Hubbali, Karnataka. You manage residential, commercial, and interior projects across Hubbali-Dharwad.

---

## Demo Environment Setup

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example to .env.local and fill in:
#    - Clerk keys (sign up at clerk.com)
#    - DATABASE_URL (Neon / Supabase PostgreSQL)
#    - Razorpay test keys (optional)

# 3. Push schema & generate client
npm run db:push && npm run db:generate

# 4. Seed the demo database (PowerShell)
$env:DATABASE_URL = "<your-db-url>"
$env:OWNER_CLERK_ID = "user_xxxx"   # your Clerk user ID
npx tsx prisma/seed.ts

# 5. Start dev server
npm run dev
```

> **Tip:** Find your Clerk user ID in the [Clerk Dashboard → Users](https://dashboard.clerk.com). Setting `OWNER_CLERK_ID` links the demo firm to your real account so you can sign in and see all data.

### What gets seeded

| Entity | Count | Highlights |
|--------|------:|------------|
| Firm | 1 | DesignCraft Studios, GST-registered, Hubbali, **Enterprise plan** |
| Users | 5 | All 5 roles (see below) |
| Clients | 8 | Mix of residential, commercial, NRI |
| Projects | 10 | 6 project types, 7 stages, Active/Completed/On-hold |
| Milestones | 20 | PAID / DUE / OVERDUE / UNPAID / UPCOMING |
| Invoices | 14 | PAID / UNPAID / OVERDUE / DRAFT |
| Drawings | 12 | Up to v3, 4 statuses, with version history |
| Drawing Comments | 13 | Team + client comments |
| Leads | 12 | All 8 pipeline stages, 8 lead sources |
| Lead Activities | 15 | Calls, emails, WhatsApp, proposals, site visits, stage changes |
| Vendors | 8 | 8 categories with ratings and GST |
| Site Updates | 10 | With photos and weather data |
| Site Issues | 6 | CRITICAL / HIGH / MEDIUM / LOW × OPEN / IN_PROGRESS / RESOLVED / CLOSED |

---

## Team Roster & Login Credentials

All 5 roles have real Clerk accounts for persona-based demos:

| Role | Name | Email (login) | Password | Demo Focus |
|------|------|---------------|----------|------------|
| **OWNER** | Arjun Deshpande | gen.girish@gmail.com | *(Google sign-in)* | Full access. Dashboards, billing, approvals, firm settings |
| **ARCHITECT** | Priya Naik | priya@designcraft.in | `Demo@2026` | Project design, drawing review, client walkthroughs |
| **DRAFTSMAN** | Anil Bijapur | anil@designcraft.in | `Demo@2026` | Drawing uploads, version management, detail work |
| **SITE_MANAGER** | Ramesh Gowda | ramesh@designcraft.in | `Demo@2026` | Site updates, issue logging, daily progress photos |
| **ADMIN** | Sneha Kulkarni | sneha@designcraft.in | `Demo@2026` | Lead follow-ups, scheduling, administrative notes |

### How to demo different roles

1. Open https://archdesk.vercel.app in a **normal browser window** — sign in as **Owner** (Google)
2. Open an **incognito/private window** — sign in as **Architect** (priya@designcraft.in / Demo@2026)
3. Show both side-by-side to demonstrate role-specific views

> **Tip:** Use different browser profiles (Chrome/Edge/Firefox) to stay signed in as multiple roles simultaneously without logging out.

---

## Client Directory

| Client | Phone | City | Project(s) | Notes |
|--------|-------|------|-----------|-------|
| Rajesh Kulkarni | 7416642072 | Hubbali | Kulkarni Residence, Vidya Niketan School | Long-term client, WhatsApp preferred |
| Lakshmi Hegde | 7416642072 | Hubbali | Hegde Villa, Hegde Garden (completed) | Detail-oriented, wants photo updates |
| Vikram Patil | 7416642072 | Hubbali | Patil Farmhouse | NRI client — prefers email & portal |
| Dr. Ananya Bhat | 7416642072 | Hubbali | Bhat Dental Clinic | Available after 6 PM only |
| Siddharth Nadiger | 7416642072 | Dharwad | Nadiger Retail Showroom | Weekend meetings, showroom chain |
| Meera Joshi | 7416642072 | Hubbali | Joshi Apartment Interiors | — |
| Naveen Hosamani | 7416642072 | Hubbali | Hosamani Warehouse | Referred by Rajesh Kulkarni |
| Savita Desai | 7416642072 | Hubbali | Desai Row Houses (on-hold) | — |

---

## Project Portfolio

### By Type

| Type | Projects | Budget Range |
|------|----------|-------------|
| Residential | 4 | ₹18.5L – ₹2Cr |
| Commercial | 2 | ₹85L – ₹1.2Cr |
| Interior | 1 | ₹18.5L |
| Institutional | 1 | ₹1.85Cr |
| Landscape | 1 | ₹16.5L (completed) |
| Industrial | 1 | ₹95L |

### All Projects

| # | Project | Client | Type | Stage | Status | Budget | Area |
|---|---------|--------|------|-------|--------|--------|------|
| 1 | Kulkarni Residence — Gokul Road | Rajesh Kulkarni | Residential | Working Drawings | Active | ₹28L | 1,850 sqft |
| 2 | Hegde Villa — Vidyanagar | Lakshmi Hegde | Residential | Design Dev | Active | ₹45L | 2,400 sqft |
| 3 | Patil Farmhouse — Unkal | Vikram Patil | Residential | Execution | Active | ₹62L | 3,200 sqft |
| 4 | Bhat Dental Clinic — Keshwapur | Dr. Ananya Bhat | Commercial | Schematic | Active | ₹85L | 2,100 sqft |
| 5 | Nadiger Retail Showroom — Dharwad | Siddharth Nadiger | Commercial | Execution | Active | ₹1.2Cr | 4,800 sqft |
| 6 | Joshi Apartment Interiors — Navanagar | Meera Joshi | Interior | Execution | Active | ₹18.5L | 1,450 sqft |
| 7 | Vidya Niketan School Extension | Rajesh Kulkarni | Institutional | Schematic | Active | ₹1.85Cr | 4,800 sqft |
| 8 | Hegde Garden & Driveway | Lakshmi Hegde | Landscape | Completed | Completed | ₹16.5L | 4,200 sqft |
| 9 | Hosamani Warehouse — Industrial Area | Naveen Hosamani | Industrial | Concept | Active | ₹95L | 5,000 sqft |
| 10 | Desai Row Houses — Phase 1 | Savita Desai | Residential | Concept | On Hold | ₹2Cr | 4,500 sqft |

### Team Assignments

| Project | Lead | Support | Site |
|---------|------|---------|------|
| Kulkarni Residence | Arjun (Owner) | Anil (Draftsman) | Ramesh (Site Mgr) |
| Hegde Villa | Priya (Architect) | Anil (Draftsman) | — |
| Patil Farmhouse | Arjun (Owner) | Priya (Architect) | Ramesh (Site Mgr) |
| Bhat Dental Clinic | Priya (Architect) | Anil (Draftsman) | — |
| Nadiger Showroom | Arjun + Priya | Anil (Draftsman) | Ramesh (Site Mgr) |
| Joshi Interiors | Priya (Interior) | — | Ramesh (Site Mgr) |
| Vidya Niketan School | Arjun (Owner) | Priya (Architect) | — |
| Hegde Garden | Priya (Landscape) | — | — |
| Hosamani Warehouse | Arjun (Owner) | — | — |
| Desai Row Houses | Arjun (Owner) | Priya (Architect) | — |

---

## Financial Overview

### Milestone Payment Schedule

| Milestone | Project | Amount | GST (18%) | Total | Status |
|-----------|---------|--------|-----------|-------|--------|
| Concept Design Fee | Kulkarni Residence | ₹1,50,000 | ₹27,000 | ₹1,77,000 | **PAID** (28 Jan) |
| Schematic Design Fee | Kulkarni Residence | ₹2,00,000 | ₹36,000 | ₹2,36,000 | **PAID** (10 Apr) |
| Working Drawings Package | Kulkarni Residence | ₹3,50,000 | ₹63,000 | ₹4,13,000 | DUE |
| Site Analysis & Brief | Hegde Villa | ₹80,000 | ₹14,400 | ₹94,400 | **PAID** (28 Sep '24) |
| Schematic Design | Hegde Villa | ₹2,20,000 | ₹39,600 | ₹2,59,600 | **PAID** (8 Jan) |
| Design Development | Hegde Villa | ₹2,80,000 | ₹50,400 | ₹3,30,400 | UNPAID |
| GFC & Statutory | Patil Farmhouse | ₹4,00,000 | ₹72,000 | ₹4,72,000 | **PAID** (25 Jul '24) |
| Site Coord — Phase 1 | Patil Farmhouse | ₹1,80,000 | ₹32,400 | ₹2,12,400 | **OVERDUE** |
| Site Coord — Phase 2 | Patil Farmhouse | ₹1,80,000 | ₹32,400 | ₹2,12,400 | UPCOMING |
| Concept & Zoning | Bhat Clinic | ₹1,20,000 | ₹21,600 | ₹1,41,600 | **PAID** (12 Mar) |
| Schematic Design | Bhat Clinic | ₹4,50,000 | ₹81,000 | ₹5,31,000 | DUE |
| Schematic Design | Nadiger Showroom | ₹6,00,000 | ₹1,08,000 | ₹7,08,000 | **PAID** (29 Jan) |
| Working Drawings & MEP | Nadiger Showroom | ₹9,00,000 | ₹1,62,000 | ₹10,62,000 | **PAID** (14 May) |
| Execution Supervision Q1 | Nadiger Showroom | ₹3,50,000 | ₹63,000 | ₹4,13,000 | DUE |
| Mood Boards & BOQ | Joshi Interiors | ₹95,000 | ₹17,100 | ₹1,12,100 | **PAID** (18 Mar) |
| Execution Drawings | Joshi Interiors | ₹1,40,000 | ₹25,200 | ₹1,65,200 | UNPAID |
| Preliminary Design | Vidya Niketan | ₹9,50,000 | ₹1,71,000 | ₹11,21,000 | UPCOMING |
| Landscape Concept | Hegde Garden | ₹85,000 | ₹15,300 | ₹1,00,300 | **PAID** (28 Apr '24) |
| Execution & Supervision | Hegde Garden | ₹1,20,000 | ₹21,600 | ₹1,41,600 | **PAID** (2 Dec '24) |
| Concept & Feasibility | Hosamani Warehouse | ₹2,50,000 | ₹45,000 | ₹2,95,000 | DUE |

### Invoice Summary

| Status | Count | Total |
|--------|------:|------:|
| PAID | 11 | ₹50,63,000 |
| UNPAID | 1 | ₹3,30,400 |
| OVERDUE | 1 | ₹2,12,400 |
| DRAFT | 1 | ₹2,95,000 |

---

## Drawings & Review Workflow

| Drawing | Project | Type | Version | Status | Comments |
|---------|---------|------|---------|--------|----------|
| Ground Floor Plan | Kulkarni Residence | Plan | v3 | Approved | 3 (owner approval, architect note, client question) |
| First Floor Plan | Kulkarni Residence | Plan | v2 | Approved | 2 (owner approval, client question) |
| Front Elevation | Kulkarni Residence | Elevation | v1 | Pending Review | — |
| 3D Exterior Render | Hegde Villa | Render | v2 | Approved | 2 (owner direction, client alternative request) |
| Section A–A | Hegde Villa | Section | v2 | Revision Requested | 2 (architect NBC compliance flag, draftsman ack) |
| Foundation Detail | Patil Farmhouse | Detail | v1 | Approved | — |
| Pool & Deck Layout | Patil Farmhouse | Plan | v1 | Pending Review | — |
| Clinic Floor Plan | Bhat Clinic | Plan | v1 | Pending Review | 2 (architect AERB note, client request) |
| Structural Grid | Nadiger Showroom | Detail | v1 | Approved | — |
| Electrical Layout GF | Nadiger Showroom | Detail | v2 | Approved | — |
| Living-Dining 3D | Joshi Interiors | Render | v2 | Approved | 2 (architect direction, client colour request) |
| Site Plan & Parking | Vidya Niketan | Plan | v1 | Pending Review | — |

### Sample Drawing Comments (for demo)

- **Client comment:** *"Can we add a shoe rack near the entrance? Otherwise looks perfect."* — Rajesh Kulkarni on Ground Floor Plan
- **Architect flag:** *"Staircase headroom is 2.0m — needs minimum 2.2m per NBC."* — Priya Naik on Section A–A
- **Client feedback:** *"Love the stone cladding! Can we see an option with grey tiles instead?"* — Lakshmi Hegde on 3D Render
- **Clinical requirement:** *"Please add a separate staff entrance. Also the waiting area feels small."* — Dr. Ananya Bhat on Clinic Plan

---

## Leads Pipeline

### Pipeline Stages

| Stage | Leads | Example |
|-------|------:|---------|
| NEW | 3 | Prakash Sutar (₹32L duplex, Instagram), Pallavi Shirur (₹9.5L interior), Deepa Gadag (₹27L, Instagram DM) |
| CONTACTED | 2 | Divya Kamat (₹12L interior, website), Basavaraj Angadi (₹78L commercial, website) |
| SITE_VISIT | 2 | Ravi Moorgeri (₹1.5Cr café + co-working, referral), Shweta Toravi (₹41L residential, referral) |
| PROPOSAL_SENT | 2 | Sneha Mannur (₹55L residential, phone), Arun Hosalli (₹1.1Cr cold storage, phone) |
| NEGOTIATION | 1 | Kiran Badiger (₹6.5L landscape, walk-in) |
| WON | 1 | Nethra Gouda (₹2.2Cr NGO learning centre, Houzz) |
| LOST | 1 | Manoj Hiremath (₹18L residential, Facebook — chose packaged builder) |

### Lead Sources Distribution

| Source | Count |
|--------|------:|
| Instagram | 2 |
| Website | 2 |
| Referral | 2 |
| Phone | 2 |
| Walk-in | 1 |
| Houzz | 1 |
| Facebook | 1 |
| Other | 1 |

### Lead Activity Trail (demo of CRM workflow)

1. **Prakash Sutar** (NEW): WhatsApp portfolio + fee structure sent → follow-up scheduled
2. **Divya Kamat** (CONTACTED): Initial call → mood boards + BOQ emailed
3. **Ravi Moorgeri** (SITE_VISIT): Plot measured → detailed proposal sent (₹12L fee)
4. **Sneha Mannur** (PROPOSAL_SENT): Site visited → proposal with 8% fee sent
5. **Kiran Badiger** (NEGOTIATION): Discussing phased execution to fit budget
6. **Nethra Gouda** (WON): Formal agreement signed
7. **Manoj Hiremath** (LOST): Lost to packaged builder (price-sensitive)

---

## Vendor Network

| Vendor | Category | City | Rating | GST | Specialty |
|--------|----------|------|--------|-----|-----------|
| Shree Basaveshwara Civil Contractors | Contractor | Hubbali | ★★★★★ | Yes | Go-to for RCC & masonry. 20+ years |
| Karnataka Tile House | Tiles | Hubbali | ★★★★ | — | Full vitrified, ceramic, sanitary display |
| PowerLine Electricals | Electrical | Hubbali | ★★★★ | Yes | Havells & Schneider auth. Home automation |
| FlowRight Plumbing Solutions | Plumbing | Hubbali | ★★★★★ | — | Best plumbing crew. Jaquar certified |
| ColourCraft Paints & Coatings | Paint | Hubbali | ★★★★ | — | Asian Paints & Berger authorised |
| North Karnataka Steel Traders | Steel | Hubbali | ★★★★ | Yes | TMT bars. Same-day delivery |
| Dharwad Wood Works | Wood | Dharwad | ★★★★★ | — | Premium teak & sal. Custom frames |
| Crystal Glass & Aluminium | Glass | Hubbali | ★★★ | Yes | Standard work. Premium via Belagavi |

---

## Site Tracker

### Recent Site Updates

| Date | Project | By | Note | Photos | Weather |
|------|---------|-----|------|--------|---------|
| Recent | Patil Farmhouse | Ramesh (Site Mgr) | First floor slab casting done. Curing 14 days. | 2 | Clear, 34°C |
| Recent | Patil Farmhouse | Ramesh (Site Mgr) | Brickwork GF 80%. Lintel beams poured. | 2 | Partly cloudy, 30°C |
| Recent | Patil Farmhouse | Arjun (Owner) | Client site visit. Happy. Bathroom tile change requested. | 1 | Clear, 32°C |
| Recent | Nadiger Showroom | Ramesh (Site Mgr) | GF column casting done. FF steel being tied. | 3 | Sunny, 36°C |
| Recent | Nadiger Showroom | Ramesh (Site Mgr) | Electrical conduit laying. MEP coordination done. | 1 | — |
| Recent | Joshi Interiors | Ramesh (Site Mgr) | False ceiling framework installed. POP tomorrow. | 2 | Overcast, 28°C |
| Recent | Joshi Interiors | Priya (Architect) | Modular kitchen carcass delivered. Checking dims. | 1 | — |
| Recent | Hegde Villa | Priya (Architect) | Client 3D walkthrough. Parapet height tweaks. | — | — |
| Recent | Bhat Clinic | Priya (Architect) | Setback verification. Awaiting NOC from client. | 1 | — |
| Recent | Kulkarni Residence | Anil (Draftsman) | GF structure working drawings in progress. | — | — |

### Open Issues

| Issue | Project | Severity | Status | Assigned To |
|-------|---------|----------|--------|-------------|
| Concrete quality test failure (18 MPa vs 25 MPa required) | Patil Farmhouse | **CRITICAL** | Open | Arjun |
| Water seepage in basement wall | Patil Farmhouse | HIGH | Open | Ramesh |
| Steel delivery delayed 5 days | Patil Farmhouse | MEDIUM | In Progress | NK Steel Traders |
| Column alignment off 15mm | Nadiger Showroom | MEDIUM | Resolved | Ramesh |
| Wrong tile shade delivered | Joshi Interiors | LOW | Resolved | Karnataka Tile House |
| Neighbour noise complaint | Nadiger Showroom | LOW | Closed | Ramesh |

---

## Demo Script

### Scene 1: Landing Page

**URL:** `/`

**Show:**
- Dark-themed landing page with gold accents
- Tagline: *"Run your architecture firm from one desk"*
- India-specific callouts: GST invoicing, UPI payments, INR formatting

**Say:** "ArchDesk is purpose-built for architecture firms in Tier-2 Indian cities — not a generic project management tool."

---

### Scene 2: Sign In → Dashboard

**URL:** `/dashboard`

**Show:**
- 8 active projects, revenue in ₹ lakhs, pending drawing approvals, active leads with pipeline value
- Overdue milestone alerts
- Project stage distribution

**Say:** "Arjun opens ArchDesk every morning and knows exactly where his firm stands. Revenue in lakhs, not dollars."

---

### Scene 3: Projects

**URL:** `/projects`

**Show:**
- 10 projects across 6 types, grid/list toggle, type & stage filters
- Click into Patil Farmhouse → milestones, drawings, site updates, team

**Say:** "Every project flows through architecture-specific stages — Concept to Completed. Budgets automatically format as ₹45L or ₹1.2Cr."

---

### Scene 4: Drawing Collaboration

**URL:** `/drawings`

**Show:**
- 12 drawings with version badges and status (Approved/Pending/Revision Requested)
- **Upload Drawing** — pick a PDF or image (or CAD where allowed); the app uploads to Supabase Storage and creates the drawing row (no manual file URL)
- Click into Ground Floor Plan → v1, v2, v3 history + team and client comments

**Say:** "No more 'Plan_Final_v3_FINAL_really_final.dwg'. Version tracking and threaded comments replace the WhatsApp chaos. Clients comment right here."

---

### Scene 5: Billing & Invoices

**URL:** `/billing`

**Show:**
- 20 milestones with GST breakup, payment status colour coding
- OVERDUE flag on Patil Farmhouse Phase 1
- Client Decision column with Open/Close toggles and "Nudge client" action
- SLA automation controls: "Run SLA scan" and "Auto-nudge breached" buttons

**Say:** "Billing is tied to project stages — when schematic design is done, the fee becomes due. GST at 18% is auto-calculated. Amounts in Indian format: ₹1,00,000. Open a decision request and the client sees it instantly in their portal. If they don't respond within 48 hours, auto-nudge catches it."

---

### Scene 6: Leads CRM

**URL:** `/leads`

**Show:**
- Pipeline view: NEW → CONTACTED → SITE_VISIT → PROPOSAL_SENT → NEGOTIATION → WON/LOST
- Lead sources: Instagram, referrals, website, walk-ins
- Activity trail: call logs, WhatsApp messages, proposals

**Say:** "Most firms track leads in their head. ArchDesk shows the full pipeline — ₹2.2Cr in WON, ₹1.5Cr in active negotiation. Instagram and referrals are the top sources."

---

### Scene 7: Site Tracker & Issues

**URL:** `/site-tracker`

**Show:**
- Daily logs with photos and weather from Ramesh (site manager)
- CRITICAL issue: concrete quality test failure
- Issue resolution history

**Say:** "Ramesh logs progress from his phone every evening. Arjun reviews from home. The CRITICAL concrete test failure is flagged immediately — no waiting for the next site visit."

---

### Scene 8: AI Cost Estimator

**URL:** `/ai-estimator`

**Show:**
- Input: Residential, 1800 sqft, Premium, Hubbali, 2 floors
- Output: ₹36-40L breakdown by category (structure, plumbing, electrical, etc.) with GST
- "Create Project" button

**Say:** "Client asks 'How much will it cost?' — instant, professional answer. Rates are real Indian construction rates. One click creates a project."

---

### Scene 9: Client Portal

**URL:** `/portal/[token]`

**Show:**
- Light-themed, branded page with project timeline
- Milestone payments with status (Paid/Upcoming/Overdue)
- Approved drawings and site photos

**Say:** "Clients get a magic link. No app, no account. They see their project progress, approved drawings, and payment schedule. Replaces the daily 'kya update hai?' WhatsApp messages."

---

### Scene 10: Vendor Network

**URL:** `/vendors`

**Show:**
- 8 vendors, star ratings, GST numbers, categories
- Filter by Contractor, Tiles, Electrical, etc.

**Say:** "Arjun's rated vendor network. When starting a new project, he knows exactly who to call — and their GST numbers are ready for input tax credit."

---

### Scene 11: 3D Studio (Floor Plan to Flat Preview)

**URL:** `/3d-studio`

**Show:**
- Project selector + floor plan selector
- "Upload Plan" action (PDF/DXF/image) that creates a parsed floor plan record
- "Sample Plan" action to generate a default floor layout
- "Generate 3D" action to create scene payload
- Interactive Babylon.js preview with orbit camera and generated walls

**Say:** "This is our first floor-plan-to-3D workflow. Architects can upload a PDF/DXF/image, let ArchDesk convert it into canonical geometry, generate a 3D shell, and preview layout decisions directly in-browser."

---

## Closing Pitch

### The Problem
Architecture firms in Tier-2 India run on WhatsApp + Excel + memory. Project status lives in the architect's head. Invoices are Word docs. Drawings are loose WhatsApp files. Site progress = phone calls.

### The Solution
One desk for everything:
- **Projects** through architecture-specific stages
- **Drawings** versioned with client commenting
- **Billing** with GST compliance and UPI collection
- **Site progress** with daily photo logs and issue tracking
- **Leads** in a visual pipeline with source analytics
- **AI estimator** for instant client-facing cost answers
- **Client portal** for self-service project visibility

### Why ArchDesk Wins
1. **India-first** — INR (₹ lakhs/crores), GST, UPI, Indian phone numbers
2. **Architecture-specific** — Project stages, drawing workflows, milestone billing
3. **Tier-2 focused** — Built for Hubbali, not Bangalore startups
4. **Client portal** — Magic-link access, no downloads
5. **AI-powered** — Cost estimation with real Indian construction rates
6. **SaaS-ready** — Free / Pro / Enterprise tiers with feature gating

---

## Current Status

| Area | Status |
|------|--------|
| Landing page | Built (static, styled) |
| Authentication | Clerk + webhook auto-provisioning |
| Dashboard | **Live data** (API-driven) |
| Projects | Built (API CRUD complete) |
| Clients | Built (API CRUD complete) |
| Drawings | Built (API CRUD, versions, comments) |
| Billing | Built (API + GST PDF + decision SLA automation) |
| Leads CRM | Built (API CRUD + one-click conversion) |
| Site Tracker | Built (API CRUD, issues, photos) |
| Vendors | Built (API CRUD complete) |
| Settings | Built (API GET/PATCH) |
| AI Cost Estimator | Built (interactive, Indian rates, **PDF download**) |
| Client Portal | Built (magic-link, project timeline, decision inbox) |
| 3D Studio | Built (MVP: floor plans, 3D scene generation, Babylon.js preview) |
| Analytics | Built (cash flow, decisions, SLA health, bottlenecks) |
| SaaS Plan Tiers | Built (Free/Pro/Enterprise, stored in Firm model) |
| CI/CD | GitHub Actions (typecheck, lint, build, E2E smoke) |
| API routes | 20+ endpoints |
| Database | 17 Prisma models + comprehensive seed |
| E2E tests | **42 Playwright tests** (22 public + 20 authenticated) |
| Demo data | **5 roles, 10 projects, 20 milestones, 12 drawings, 12 leads, 8 vendors, 6 issues** |
| Demo plan | **Enterprise** — all features unlocked for demos |
