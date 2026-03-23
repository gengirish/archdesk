# ArchDesk — Demo Walkthrough

> A guided tour of ArchDesk for stakeholders, investors, and early users.
>
> **Persona:** You are Arjun, the owner of "ArchiVision Studio" — a 5-person architecture firm in Hubbali, Karnataka. You manage residential and interior design projects across Hubbali-Dharwad.

---

## Prerequisites

Before running the demo:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
#    Copy .env.example to .env.local and fill in:
#    - Clerk keys (sign up at clerk.com)
#    - Supabase database URL and API keys (sign up at supabase.com)
#    - Razorpay test keys (optional for demo)

# 3. Push database schema
npm run db:push

# 4. Generate Prisma client
npm run db:generate

# 5. Start the dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Demo Script

### Scene 1: Landing Page

**URL:** `http://localhost:3000`

**What you see:**
- Clean, dark-themed landing page with the ArchDesk brand (gold on dark)
- Tagline: *"Run your architecture firm from one desk"*
- Badge: *"Built for architects in Hubbali, Karnataka"*
- Six feature cards: Project Tracker, Drawing Management, Milestone Billing, Site Updates, Leads CRM, Firm Dashboard
- India-specific callout section highlighting GST invoicing, UPI payments, and INR formatting

**Talking points:**
- "ArchDesk is built specifically for architecture firms in Tier-2 Indian cities"
- "It's not a generic project management tool — it understands project stages, milestone billing, drawing approvals, and GST compliance"
- "Everything is in INR with lakh/crore formatting, not dollars"

**Action:** Click "Get Started" or "Sign In" to proceed.

---

### Scene 2: Authentication

**URL:** `/sign-in` or `/sign-up`

**What you see:**
- Clerk's sign-in/sign-up widget, centered on the dark background

**Talking points:**
- "Authentication is handled by Clerk — enterprise-grade security without building it ourselves"
- "Supports email, Google, and phone number sign-in"
- "Each user belongs to one firm — complete data isolation between firms"

**Action:** Sign in with your test account.

---

### Scene 3: Dashboard

**URL:** `/dashboard`

**What you see:**
- Collapsible sidebar with all modules (Projects, Clients, Drawings, Billing, Site Tracker, Leads, Vendors, Settings)
- Top bar with search, notifications bell, and user avatar
- Four stat cards:
  - **8 Active Projects**
  - **Revenue This Month: ₹4.9L** (note the Indian lakh format)
  - **5 Pending Approvals** (drawings awaiting review)
  - **12 Active Leads** with pipeline value of ₹28.5L
- Overdue alert banner: "2 projects have overdue milestones"
- Recent Projects list with stage badges (colour-coded)
- Revenue Summary with +52% month-over-month growth
- Project Stage Distribution showing how many projects are in each stage

**Talking points:**
- "Arjun opens ArchDesk every morning and sees exactly where his firm stands"
- "Revenue is shown in lakhs — ₹4.9L, not ₹490,000. This is how Indian architects think about money"
- "The overdue alert immediately flags projects needing attention"
- "Stage distribution helps Arjun balance his team's workload — too many projects in Execution means he needs more site managers"

---

### Scene 4: Projects

**URL:** `/projects`

**What you see:**
- Header: "6 projects, 5 active"
- "New Project" button (primary, gold)
- Search bar, type filter (Residential, Commercial, etc.), stage filter, and grid/list toggle
- Project cards showing:
  - **Patil Residence** — Working Drawings, 2,400 sqft, ₹35L, Vidyanagar Hubbali
  - **Sharma Interiors** — Design Dev, 1,800 sqft, ₹12L, Keshwapur
  - **KLE Campus Block B** — Execution, 12,000 sqft, ₹1.5Cr, Vidyanagar
  - **Deshpande Office** — Concept, 600 sqft, ₹8L, CBD Dharwad
  - **Green Valley Homes** — Schematic, 8,000 sqft, ₹95L, Navanagar
  - **Cafe Aroma Fit-out** — Completed, 450 sqft, ₹6.5L, Lamington Road

**Demo actions:**
1. Toggle between grid and list view — "Arjun prefers grid view for quick scanning, list view for data comparison"
2. Filter by "INTERIOR" type — shows only Sharma Interiors and Cafe Aroma
3. Filter by "EXECUTION" stage — shows only KLE Campus
4. Search "Patil" — instant filter

**Talking points:**
- "Each project tracks its stage through the architecture workflow: Concept → Schematic → Design Dev → Working Drawings → Execution → Completed"
- "Note the KLE Campus budget is shown as ₹1.5Cr — automatic crore formatting for large projects"
- "Locations are local — Vidyanagar, Keshwapur, Navanagar — real Hubbali neighbourhoods"

---

### Scene 5: Clients

**URL:** `/clients`

**What you see:**
- Six client cards with avatar initials, phone numbers (+91 format), email, city, and project count
- Search bar filtering by name or phone

**Talking points:**
- "Every client is linked to their projects. Arjun can see Hubli Builders has 4 projects — they're his biggest client"
- "Phone numbers are 10-digit Indian mobiles with +91 prefix"
- "Cities default to Hubbali but support the wider region: Dharwad, Belagavi, Davangere"

---

### Scene 6: Drawings

**URL:** `/drawings`

**What you see:**
- Drawing gallery with blueprint-style preview placeholders
- Each card shows: drawing name, project, type badge, version number, file size, comment count, status, and last update date
- Status badges colour-coded: Gold (Pending Review), Green (Approved), Red (Revision Requested)

**Talking points:**
- "Arjun's draftsman uploads the Ground Floor Plan. It starts as 'Pending Review'"
- "Arjun reviews it, approves it, or sends it back with a revision request"
- "Version tracking means no more 'Plan_Final_v3_FINAL_really_final.dwg'"
- "The client can also comment on drawings through the portal — no WhatsApp needed"
- "Section A-A is on v2 with 6 comments and marked 'Revision Requested' — it needs work"

---

### Scene 7: Billing

**URL:** `/billing`

**What you see:**
- Summary cards:
  - **Total Billed: ₹30.5L**
  - **Collected: ₹18.5L** (green)
  - **Outstanding: ₹4L** (yellow)
  - **Collection Rate: 61%** with progress bar
- Milestone table with 8 entries across 3 projects
- Each row shows: milestone name, stage, project, base amount, GST-inclusive amount, and status

**Demo details to highlight:**
- Patil Residence Retainer: ₹1,00,000 base → ₹1,18,000 with GST
- KLE Campus Execution Supervision: ₹10,00,000 — upcoming
- Sharma Interiors Design Fee: ₹1,50,000 — **OVERDUE** (red indicator)

**Talking points:**
- "Billing is tied to project stages — not arbitrary invoices. When Arjun completes schematic design, the schematic fee becomes due"
- "GST at 18% is automatically calculated and shown on every milestone"
- "Amounts use Indian formatting: ₹1,00,000 not ₹100,000"
- "Arjun can generate a Razorpay payment link and send it to the client via WhatsApp. The client pays via UPI — no cheques, no bank transfers"
- "The overdue indicator on Sharma Interiors flags that Priya hasn't paid the design fee yet"

---

### Scene 8: Leads CRM

**URL:** `/leads`

**What you see:**
- Kanban board with 5 pipeline columns: New, Contacted, Site Visit, Proposal Sent, Negotiation
- Lead cards showing: name, phone, project type, budget, and source
- Pipeline value: ₹1.5Cr (sum of all active lead budgets)
- Won and Lost sections below the pipeline

**Demo walkthrough:**
1. **New column:** Mahesh Hegde (₹50L residential, via Referral) and Meera Patil (₹6L landscape, via Facebook)
2. **Contacted:** Sunita Naik (₹8L interior, via Instagram) — "Arjun's Instagram posts brought this lead in"
3. **Site Visit:** Vinod Desai (₹32L commercial, walk-in)
4. **Proposal Sent:** Pooja Joshi (₹45L residential, via website)
5. **Negotiation:** Arun Kulkarni (₹12L interior, referral)
6. **Won:** Sanjay Gowda (₹1.2Cr commercial) — "This one converted to a project"

**Talking points:**
- "Most architecture firms in India track leads in their head or a notebook. ArchDesk gives them a visual pipeline"
- "Lead sources are India-specific: Instagram and Facebook are huge for architects, plus referrals are the #1 source"
- "When a lead is Won, it converts directly into a project — no re-entry of data"
- "Pipeline value helps Arjun forecast revenue: ₹1.5Cr in the pipeline means he can plan hiring"

---

### Scene 9: Site Tracker

**URL:** `/site-tracker`

**What you see:**
- Left (2/3): Timeline of site updates with user avatars
- Right (1/3): Open issues sidebar

**Site updates shown:**
1. Anil Kumar @ Patil Residence — "Foundation work completed. Plinth beam casting done."(3 photos, Sunny, Execution stage)
2. Prakash S @ KLE Campus — "Second floor slab shuttering in progress. Steel binding 70% complete."(5 photos, Partly Cloudy)
3. Previous updates with brick work, material delivery, false ceiling work

**Issues sidebar:**
- Water seepage in basement (HIGH, Open) — Patil Residence
- Steel delivery delayed (MEDIUM, In Progress) — KLE Campus
- Wrong tile shade delivered (LOW, Resolved) — Sharma Interiors

**Talking points:**
- "Anil Kumar is Arjun's site manager. Every evening he logs what happened on site with photos"
- "Weather tracking matters — monsoon delays are common in Karnataka"
- "Issues are colour-coded by severity. The water seepage is HIGH priority and still OPEN"
- "Arjun reviews this from his office or home — he doesn't need to visit every site every day"
- "The client can also see progress updates through their portal"

---

### Scene 10: Vendors

**URL:** `/vendors`

**What you see:**
- Vendor cards with name, category, phone, city, star rating, and GST number
- Category filter dropdown
- Vendors across Hubbali, Dharwad, and Belagavi

**Notable vendors:**
- Hubli Steel Centre — 5 stars, Hubbali
- Karnataka Wood Works — 5 stars, Hubbali
- Modern Glass House — 4 stars, Belagavi (regional vendor)

**Talking points:**
- "Arjun rates every vendor after working with them. When starting a new project, he knows exactly who to call for tiles, steel, or electrical work"
- "GST numbers are tracked — important for input tax credit claims"
- "This is a local vendor network — not a national database. These are the actual suppliers in Hubbali-Dharwad"

---

### Scene 11: Settings

**URL:** `/settings`

**What you see:**
- Firm profile form: name, GST number, phone, email, address, city, website
- Brand section: brand colour picker (default gold #E8A045) and logo upload

**Talking points:**
- "The firm profile appears on every invoice and the client portal"
- "Brand colour customisation means the client portal matches the firm's identity"
- "GST number is critical — it goes on every invoice for tax compliance"

---

## Closing Summary

### The problem
Architecture firms in Tier-2 Indian cities run on WhatsApp, Excel, and memory. Project status lives in the architect's head. Invoices are Word documents. Drawings are shared as loose files. Site progress is communicated through phone calls.

### The solution
ArchDesk gives these firms a single desk to manage everything:
- **Projects** tracked through architecture-specific stages
- **Drawings** versioned and reviewed with client commenting
- **Billing** with GST compliance and UPI payment collection
- **Site progress** logged daily with photos and issue tracking
- **Leads** managed in a visual pipeline with source tracking
- **Vendors** rated and organised by category

### Why ArchDesk wins
1. **India-first** — INR formatting, GST, UPI, Indian phone numbers
2. **Architecture-specific** — Not generic PM. Understands stages, drawings, milestones
3. **Tier-2 focused** — Built for how firms in Hubbali actually work, not Bangalore startups
4. **Client portal** — Clients view progress without downloading an app or creating an account
5. **Mobile-ready** — Site managers log updates from the field on their phones

---

## Current Status

| Area | Status |
|------|--------|
| Landing page | Built (static) |
| Authentication | Clerk integrated |
| Dashboard | Built (mock data) |
| Projects | Built (mock data, grid/list, filters) |
| Clients | Built (mock data) |
| Drawings | Built (mock data) |
| Billing | Built (mock data, GST calc) |
| Leads CRM | Built (mock data, kanban) |
| Site Tracker | Built (mock data, timeline + issues) |
| Vendors | Built (mock data) |
| Settings | Built (static form) |
| API routes | Projects CRUD (Prisma + Clerk auth) |
| Database schema | Complete (Prisma, 15 models) |
| Client portal | Schema ready, UI pending |
| PDF invoices | Library installed, template pending |
| Razorpay integration | Helper functions ready, webhook pending |
| Email notifications | Resend configured, templates pending |

### Next milestones
1. Connect all pages to real database (replace mock data with API calls)
2. Build create/edit forms for projects, clients, leads, vendors
3. Implement drawing upload with Supabase Storage
4. Build client portal UI (`/portal/[token]`)
5. Create PDF invoice template
6. Wire up Razorpay payment link generation
7. Add email notifications (invoice sent, payment received, drawing approved)
8. Deploy to Vercel
