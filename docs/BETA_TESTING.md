# ArchDesk — Beta Testing Guide

> **App URL:** https://archdesk.vercel.app
>
> **GitHub:** https://github.com/gengirish/archdesk

---

## Test Accounts

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Owner** | `gen.girish@gmail.com` | Google sign-in | Full access — all modules |
| **Architect** | `priya@designcraft.in` | `Demo@2026` | Projects, drawings, 3D Studio, clients |
| **Draftsman** | `anil@designcraft.in` | `Demo@2026` | Drawing uploads, version management |
| **Site Manager** | `ramesh@designcraft.in` | `Demo@2026` | Site updates, issue logging |
| **Admin** | `sneha@designcraft.in` | `Demo@2026` | Leads CRM, scheduling, admin tasks |

**Recommended for testers:** `priya@designcraft.in` / `Demo@2026` — broad access without owner privileges, simulates a real team member.

---

## Test Checklist

### 1. Authentication

- [ ] Sign in at `/sign-in` with test credentials
- [ ] Sign out via user avatar menu (top-right)
- [ ] Verify unauthenticated users are redirected to `/sign-in`

### 2. Dashboard (`/dashboard`)

- [ ] Stat cards load with real data (active projects, revenue, leads, overdue invoices)
- [ ] Recent projects list shows project names with client info
- [ ] No loading spinners stuck indefinitely

### 3. Projects (`/projects`)

- [ ] Project cards render with budget (₹ format), area, drawing count
- [ ] "New Project" button opens dialog with form fields
- [ ] Create a new project — verify it appears in the list
- [ ] Search by project name works
- [ ] Filter by project type and stage works

### 4. Clients (`/clients`)

- [ ] Client cards show name, phone, email, city, project count
- [ ] "Add Client" opens dialog — create a client and verify it appears
- [ ] Search by name or phone works

### 5. Drawings (`/drawings`)

- [ ] Drawing cards render with preview thumbnails
- [ ] Click a drawing card → **Drawing Details** modal opens
- [ ] Modal shows: preview, status, version, file size, last updated
- [ ] "Open File" button opens the file in a new tab
- [ ] "Upload Drawing" dialog → select a file (PDF/PNG/JPG) → upload succeeds
- [ ] Uploaded drawing appears in the grid

### 6. 3D Studio (`/3d-studio`)

- [ ] Select a project from dropdown
- [ ] Click **Upload Plan** → choose a PDF, DXF, or image file
- [ ] Upload succeeds — floor plan auto-selects in dropdown
- [ ] Click **Generate 3D** → Babylon.js preview renders walls and floor
- [ ] Orbit/zoom/pan the 3D scene with mouse
- [ ] Click **Sample Plan** → creates a sample floor plan
- [ ] Upload a **different** file → generate again → layout differs from previous

### 7. Billing (`/billing`)

- [ ] Summary cards: Total Billed, Collected, Outstanding, Collection Rate
- [ ] Milestone table loads with GST breakup (18%)
- [ ] Amounts display in Indian format (₹1,05,000)
- [ ] Payment status badges: PAID (green), DUE, OVERDUE (red), UPCOMING

### 8. Leads CRM (`/leads`)

- [ ] Pipeline columns render: NEW → CONTACTED → SITE_VISIT → PROPOSAL_SENT → NEGOTIATION
- [ ] WON/LOST sections visible below pipeline
- [ ] "Add Lead" dialog works — new lead appears in NEW column
- [ ] Lead cards show name, phone, budget, source

### 9. Site Tracker (`/site-tracker`)

- [ ] Timeline entries load with project name, user, notes, photos, weather
- [ ] "Log Update" dialog → select project, add note → entry appears
- [ ] Issues section shows severity badges (CRITICAL/HIGH/MEDIUM/LOW)

### 10. Vendors (`/vendors`)

- [ ] Vendor cards show name, category, phone, city, star rating
- [ ] "Add Vendor" dialog works
- [ ] Filter by category works
- [ ] Search by vendor name works

### 11. AI Cost Estimator (`/ai-estimator`)

- [ ] Select: Residential, 1800 sqft, Premium, Hubbali, 2 floors
- [ ] Click "Estimate" → cost breakdown renders with category-wise split
- [ ] Grand total shows base + GST (18%)
- [ ] "Download estimate" → PDF downloads with correct filename

### 12. Analytics (`/analytics`)

- [ ] Cash flow summary cards load
- [ ] 12-month revenue chart renders
- [ ] Projects by stage/type charts render
- [ ] Client decision insights section shows KPIs
- [ ] SLA health distribution card visible

### 13. Settings (`/settings`)

- [ ] Firm name, GST, phone, email, address fields load
- [ ] Edit firm name → click Save → success toast
- [ ] Brand colour picker works
- [ ] Logo upload field present

### 14. Client Portal (no login required)

- [ ] Open a portal URL in **incognito**: `https://archdesk.vercel.app/portal/[token]`
- [ ] Light theme renders with firm branding
- [ ] Project timeline shows current stage highlighted
- [ ] Milestone payment table visible
- [ ] Approved drawings section shows only approved drawings
- [ ] Site update photos visible

---

## Bug Report Template

When filing a bug, include:

```
**Page:** /drawings
**Account:** priya@designcraft.in
**Steps:**
1. Click on "Kulkarni Residence" drawing card
2. Modal opens but preview image is blank

**Expected:** Drawing preview image loads
**Actual:** Blank white rectangle shown
**Browser:** Chrome 146 / Windows 11
**Screenshot:** (attach)
```

---

## Known Limitations

| Area | Note |
|------|------|
| 3D Studio | Uploaded floor plans use approximate geometry extraction — complex CAD drawings may show simplified layouts |
| Payments | Razorpay integration uses test keys — no real payments processed |
| File uploads | Max 50 MiB for drawings, 20 MiB for floor plans |
| Client portal | Token-based access — no password protection on portal links |
| Mobile | Optimised for desktop; mobile layout is functional but not fully polished |

---

## Environment Info

| Item | Value |
|------|-------|
| Production URL | https://archdesk.vercel.app |
| Framework | Next.js 14 (App Router) |
| Database | Neon PostgreSQL |
| Auth | Clerk |
| Storage | Supabase Storage |
| 3D Engine | Babylon.js |
| Hosting | Vercel |
