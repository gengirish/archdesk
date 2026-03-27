# ArchDesk — API Reference

> All endpoints require Clerk authentication unless marked **Public**.
> Standard JSON responses use: `{ data: T | null, error: string | null }`
> **Public** routes may use a different shape where noted.

---

## Projects

### `GET /api/projects`

**Auth:** Required (Clerk session)

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | `ProjectType` | Filter by project type |
| `stage` | `ProjectStage` | Filter by project stage |

**Response:** `{ data: ProjectWithRelations[], error: null }`

Each project includes: `client`, `team` (with user details), and `_count` for drawings, milestones, and site updates.

**Status codes:** 200, 401, 404 (user not found), 500

---

### `POST /api/projects`

**Auth:** Required (Clerk session)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `clientId` | string | Yes | Client ID (same firm) |
| `type` | `ProjectType` | Yes | Project type enum |
| `budget` | number | No | Budget in INR |
| `area` | number | No | Area in sqft |
| `location` | string | No | Project location |
| `startDate` | string | No | ISO date |
| `deadline` | string | No | ISO date |
| `description` | string | No | Project description |

**Response:** `{ data: ProjectWithRelations, error: null }` (201)

The creating user is added as a team member with role `"Lead Architect"`.

**Status codes:** 201, 400 (missing fields), 401, 404 (client not found), 500

---

### `GET /api/projects/[id]`

**Auth:** Required  
**Path:** `id` — project ID

**Response:** `{ data: ProjectWithRelations, error: null }`

Firm-scoped; wrong firm → 404.

**Status codes:** 200, 401, 404, 500

---

### `PATCH /api/projects/[id]`

**Auth:** Required  
**Path:** `id` — project ID

**Request body** (all optional):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Project name |
| `description` | string | Description |
| `stage` | `ProjectStage` | Current stage |
| `status` | `ProjectStatus` | Active, on hold, etc. |
| `budget` | number | Budget in INR |
| `area` | number | Area in sqft |
| `location` | string | Location |

**Response:** `{ data: ProjectWithRelations, error: null }`

**Status codes:** 200, 401, 404, 500

---

## Clients

### `GET /api/clients`

**Auth:** Required

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Optional; case-insensitive match on `name`, `phone`, or `email` |

**Response:** `{ data: ClientWithProjectCount[], error: null }` — each client includes `_count.projects`.

**Status codes:** 200, 401, 404 (user not found), 500

---

### `POST /api/clients`

**Auth:** Required

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Client name |
| `phone` | string | Yes | Phone |
| `email` | string | No | Email |
| `address` | string | No | Address |
| `city` | string | No | City |
| `notes` | string | No | Notes |

**Response:** `{ data: ClientWithProjectCount, error: null }` (201)

**Status codes:** 201, 400 (`Name and phone are required`), 401, 404, 500

---

## Leads

### `GET /api/leads`

**Auth:** Required

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `stage` | `LeadStage` | Optional filter; must be a valid enum value or **400** `Invalid stage filter` |

**Response:** `{ data: LeadWithActivities[], error: null }` — each lead includes `activities` (newest first) with `user`.

**Status codes:** 200, 400 (invalid `stage`), 401, 404, 500

---

### `POST /api/leads`

**Auth:** Required

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Lead name |
| `phone` | string | Yes | Phone |
| `source` | `LeadSource` | Yes | Must be valid enum |
| `email` | string | No | Email |
| `projectType` | `ProjectType` | No | Invalid value → 400 |
| `budget` | number | No | Budget |
| `area` | number | No | Area (sqft) |
| `notes` | string | No | Notes |
| `followUpAt` | string | No | ISO datetime |

**Response:** `{ data: LeadWithActivities, error: null }` (201)

**Status codes:** 201, 400 (missing fields / invalid `source` or `projectType`), 401, 404, 500

---

### `GET /api/leads/[id]`

**Auth:** Required  
**Path:** `id` — lead ID

**Response:** `{ data: LeadWithActivities, error: null }`

**Status codes:** 200, 401, 404 (`Lead not found`), 500

---

### `PATCH /api/leads/[id]`

**Auth:** Required  
**Path:** `id` — lead ID

If `stage` changes, a `LeadActivity` with `type: STAGE_CHANGE` and note `{old} → {new}` is created automatically before the update.

**Request body** (all optional; only sent fields are applied):

| Field | Type | Notes |
|-------|------|--------|
| `name`, `phone`, `email`, `address`, `notes` | string | |
| `projectType` | `ProjectType` | Invalid → 400 |
| `source` | `LeadSource` | Invalid → 400 |
| `stage` | `LeadStage` | Invalid → 400 |
| `budget`, `area` | number | |
| `followUpAt` | string or null | ISO datetime, or null to clear |

**Response:** `{ data: LeadWithActivities, error: null }`

**Status codes:** 200, 400, 401, 404, 500

---

### `POST /api/leads/[id]`

**Auth:** Required  
**Path:** `id` — lead ID  

**Purpose:** Convert lead → **Client** + **Project**; set lead `stage` to `WON`, set `convertedProjectId`, append a `STAGE_CHANGE` activity.

**Request body:** None (empty body is fine).

**Response:** `{ data: ProjectWithRelations, error: null }` (201) — same shape as project create (`client`, `team` with users, `_count`).

**Behaviour notes:** Uses `lead.projectType` or defaults to `RESIDENTIAL`; project name is `{lead.name} — Project`; client copied from lead name/phone/email/address/notes.

**Status codes:** 201, 400 (`Lead already converted`), 401, 404, 500

---

## Vendors

### `GET /api/vendors`

**Auth:** Required

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | `VendorCategory` | Optional; invalid value → **400** `Invalid category filter` |

**Response:** `{ data: Vendor[], error: null }`

**Status codes:** 200, 400, 401, 404, 500

---

### `POST /api/vendors`

**Auth:** Required

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Vendor name |
| `category` | `VendorCategory` | Yes | Must be valid enum |
| `phone` | string | Yes | Phone |
| `email` | string | No | |
| `address` | string | No | |
| `city` | string | No | |
| `gst` | string | No | GST number |
| `notes` | string | No | |
| `rating` | number | No | 1–5 inclusive; invalid → 400 |

**Response:** `{ data: Vendor, error: null }` (201)

**Status codes:** 201, 400, 401, 404, 500

---

## Project: Drawings

### `GET /api/projects/[id]/drawings`

**Auth:** Required  
**Path:** `id` — project ID (must belong to user’s firm)

**Response:** `{ data: DrawingWithVersionsAndComments[], error: null }` — each drawing includes `versions` (version desc) and `comments` (newest first, with `user`).

**Status codes:** 200, 401, 404 (`Project not found`), 500

---

### `POST /api/projects/[id]/drawings`

**Auth:** Required

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Drawing name |
| `type` | `DrawingType` | Yes | Enum |
| `fileUrl` | string | Yes | Storage URL |
| `fileSize` | number | No | Bytes |
| `mimeType` | string | No | MIME type |

**Response:** `{ data: DrawingWithVersionsAndComments, error: null }` (201)

**Status codes:** 201, 400, 401, 404, 500

---

## Project: Milestones

### `GET /api/projects/[id]/milestones`

**Auth:** Required

**Response:** `{ data: (Milestone & { invoices: Invoice[] })[], error: null }` — ordered by `createdAt` asc; invoices newest first per milestone.

**Status codes:** 200, 401, 404, 500

---

### `POST /api/projects/[id]/milestones`

**Auth:** Required

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Milestone name |
| `stage` | `ProjectStage` | Yes | Tied billing stage |
| `amount` | number | Yes | Base amount (before GST) |
| `dueDate` | string | No | ISO date |
| `description` | string | No | |
| `gstPercent` | number | No | Defaults to **18** |

**Response:** `{ data: Milestone & { invoices: Invoice[] }, error: null }` (201)

**Status codes:** 201, 400, 401, 404, 500

---

### `PATCH /api/projects/[id]/milestones/[milestoneId]/client-review`

**Auth:** Required

**Purpose:** Open or close client decision collection for a milestone.
Enterprise-only (firm plan must be `enterprise`).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `open` | boolean | Yes | `true` opens decision request in client portal, `false` closes it |

**Response:** `{ data: Milestone, error: null }`

**Status codes:** 200, 400, 401, 403, 404, 500

---

### `POST /api/projects/[id]/milestones/[milestoneId]/client-nudge`

**Auth:** Required

**Purpose:** Send/queue a client reminder for an open milestone decision request.
Enterprise-only (firm plan must be `enterprise`).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channel` | `"email"` \| `"whatsapp"` | No | Defaults to `"email"` |
| `message` | string | No | Optional custom message, max 500 chars |

Request is accepted only if `clientDecisionOpen=true` for the milestone.
Email channel uses Resend. WhatsApp is routed through a provider abstraction (current default: queue/stub).

**Response:** `{ data: { queued, channel, nudgeId, status, queuedAt, projectId, projectName, milestoneId, milestoneName, client }, error: null }`

**Status codes:** 200, 400, 401, 403, 404, 409, 500, 502 (provider delivery failure)

---

## Automation

### `POST /api/automation/decision-sla`

**Auth:** Required

**Purpose:** Run decision SLA automation for open client decision requests (scan only or auto-nudge breached items).
Enterprise-only and restricted to `OWNER`/`ADMIN`.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `send` | boolean | No | `false` = dry run scan (default), `true` = execute auto-nudges |
| `channel` | `"email"` \| `"whatsapp"` | No | Defaults to `"email"` |
| `limit` | number | No | Max open milestones to scan (1-100, default 25) |
| `breachHours` | number | No | SLA breach threshold in hours (4-168, default 48) |
| `nudgeCooldownHours` | number | No | Minimum hours between nudges per milestone (1-168, default 24) |
| `message` | string | No | Optional custom reminder message, max 500 chars |

**Response:** `{ data: { mode, scanned, healthy, atRisk, breached, nudged, failed, items[] }, error: null }`

`items[]` includes `projectId`, `projectName`, `milestoneId`, `milestoneName`, `slaState`, `ageHours`, `lastNudgedAt`, and `canAutoNudge`.

**Status codes:** 200, 400, 401, 403, 404, 500

---

## Project: Site updates

### `GET /api/projects/[id]/site-updates`

**Auth:** Required

**Response:** `{ data: SiteUpdateWithUser[], error: null }` — each item includes `user` (nullable); newest first.

**Status codes:** 200, 401, 404, 500

---

### `POST /api/projects/[id]/site-updates`

**Auth:** Required

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `note` | string | No | Site note |
| `photos` | string[] | No | Must be array of strings if provided |
| `milestone` | `ProjectStage` | No | Invalid → 400 |
| `weather` | string | No | Weather text |

**Response:** `{ data: SiteUpdateWithUser, error: null }` (201)

**Status codes:** 201, 400 (`photos` validation / invalid `milestone`), 401, 404, 500

---

## Firm

### `GET /api/firm`

**Auth:** Required

**Response:** `{ data: Firm, error: null }` — full firm row for the authenticated user’s `firmId`.

**Status codes:** 200, 401, 404 (user or firm not found), 500

---

### `PATCH /api/firm`

**Auth:** Required

Only these keys are applied (others ignored). At least one must be present or **400** `No valid fields to update`.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Firm name |
| `phone` | string | |
| `email` | string | |
| `address` | string | |
| `city` | string | |
| `state` | string | |
| `gstNumber` | string | |
| `website` | string | |
| `brandColor` | string | |
| `logo` | string | URL or path |

**Response:** `{ data: Firm, error: null }`

**Status codes:** 200, 400, 401, 404, 500

---

## Dashboard

### `GET /api/dashboard/stats`

**Auth:** Required

**Response:** `{ data: DashboardStats, error: null }`

| Field | Type | Description |
|-------|------|-------------|
| `activeProjects` | number | Projects with `status: ACTIVE` |
| `completedProjects` | number | `status: COMPLETED` |
| `totalRevenue` | number | Sum of `paidAmount` on milestones with `status: PAID` |
| `pendingRevenue` | number | Sum of `amount` on milestones not `PAID` |
| `totalClients` | number | Clients in firm |
| `totalLeads` | number | Leads excluding `WON` and `LOST` |
| `overdueInvoices` | number | Invoices overdue or unpaid with past milestone `dueDate` |
| `recentProjects` | array | Up to 5 projects, `updatedAt` desc, each with `client` |

**Status codes:** 200, 401, 404, 500

---

### `GET /api/dashboard/analytics`

**Auth:** Required

**Response:** `{ data: { revenueByMonth, projectsByStage, projectsByType, leadConversion, topClients, cashFlow, decisionInsights, recentActivity }, error: null }`

| Field | Description |
|-------|-------------|
| `revenueByMonth` | Last 12 calendar months: `revenue` from paid milestones by `paidAt`; `invoiced` from invoices by `createdAt` |
| `projectsByStage` / `projectsByType` | Firm `groupBy` counts |
| `leadConversion` | `total`, `won`, `lost`, `rate` (% won ÷ total leads) |
| `topClients` | Top 5 by summed project `budget` |
| `cashFlow` | `totalReceived`, `totalPending`, `totalOverdue`, `projectedNextMonth` |
| `decisionInsights` | 30-day client decision KPIs: `totalDecisionsLast30Days`, `approvedLast30Days`, `rejectedLast30Days`, `approvalRate`, `openDecisionRequests`, `avgResponseHours`, `slaHealth` (`healthy`, `atRisk`, `breached` counts across currently open decision requests), `bottlenecksByProject` (top 5 by open/delay risk, each with `projectId`, `projectName`, `openRequests`, `oldestOpenHours`, `avgResponseHours`, `decisionsLast30Days`) |
| `recentActivity` | Up to 10 mixed items (`site_update`, `lead_activity`, `invoice_payment`) with ISO `date` |

**Status codes:** 200, 401, 404, 500

---

## Billing / invoices

### `POST /api/invoices/generate`

**Auth:** Required

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `milestoneId` | string | Yes | Milestone in firm’s project |
| `notes` | string | No | Stored on invoice |

Computes GST from milestone `amount` + `gstPercent`, next firm invoice number, creates `Invoice` with status `DRAFT`. Returns entities for client-side PDF (no PDF stream).

**Response:** `{ data: { invoice, firm, client, project, milestone }, error: null }`

**Status codes:** 200, 400, 401, 404, 500

---

## AI

### `POST /api/ai/cost-estimate`

**Auth:** Required

**Request body (JSON, Zod-validated):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectType` | `ProjectType` | Yes | Same enum as DB |
| `area` | number | Yes | Sqft; positive finite |
| `quality` | string | Yes | `standard` \| `premium` \| `luxury` |
| `location` | string | Yes | 1–200 chars; drives location cost multiplier |
| `floors` | number | No | Int 1–120; default 1; +6% rate per floor above 1 |
| `includeInterior` | boolean | No | Adds ~18% interior band with sub-breakdown |

**Response:** `{ data: CostEstimateResult, error: null }`

`CostEstimateResult`:

| Path | Description |
|------|-------------|
| `summary.totalCost` | Subtotal before GST (construction + optional interior) |
| `summary.costPerSqFt` | INR per sqft (subtotal ÷ area) |
| `summary.gstAmount` / `grandTotal` | 18% GST via app helper |
| `breakdown[]` | `{ category, percentage, amount }` — construction split (Indian market bands) |
| `interiorBreakdown[]` | Present if `includeInterior`; line items |
| `timeline` | Estimated month range string |
| `rateRange` | `{ min, max, used }` INR/sqft after location & floor factors |
| `assumptions` | Human-readable strings (tiers, exclusions, GST note) |

**Status codes:** 200, 400 (validation message in `error`), 401, 404, 500

---

## Client portal

### `GET /api/portal/[token]` — **Public**

**Auth:** None (`clientToken` on project)

**Path:** `token` — project `clientToken`

**Response:** `{ data: PortalProject, error: null }`

Includes `firm`, `client`, `milestones` (with `invoices`), `drawings` (**only** `status: APPROVED`, no nested versions/comments in this route), `siteUpdates` (latest **10**), `pendingMilestoneDecisions` (where `clientDecisionOpen=true`), and `recentClientDecisions` (latest 10 responses with milestone summary).

**Status codes:** 200, 404 (`Not found` for missing/empty token or unknown token), 500

---

### `GET /api/portal/[token]/decisions` — **Public**

**Auth:** None (`clientToken` on project)

**Response:** `{ data: { pendingMilestoneDecisions, recentDecisions }, error: null }`

- `pendingMilestoneDecisions`: open milestone decision cards for this project
- `recentDecisions`: latest 10 submitted client decisions with milestone context

**Status codes:** 200, 404, 500

---

### `POST /api/portal/[token]/decisions` — **Public**

**Auth:** None (`clientToken` on project)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `milestoneId` | string | Yes | Milestone ID within token's project |
| `outcome` | `ClientDecisionOutcome` | Yes | `APPROVED` or `REJECTED` |
| `comment` | string | Yes | Trimmed comment, 1-2000 chars |
| `respondentName` | string | No | Optional client name |
| `costDeltaAmount` | number | No | Optional price delta metadata |
| `costDeltaNote` | string | No | Optional context for cost delta |

Creates a decision row and atomically closes milestone review (`clientDecisionOpen=false`).
Supports optional `Idempotency-Key` header (8-128 chars).  
POST route is rate-limited per token/IP window and can return 429 with `Retry-After`.

**Response:** `{ data: ClientDecision, error: null }` (201)

**Status codes:** 200 (idempotent replay), 201, 400, 404, 409 (`This decision request is closed`), 429, 500

---

## Webhooks

### `POST /api/webhooks/clerk` — **Public**

**Auth:** Clerk signature verification (`verifyWebhook`); invalid signature → **400** plain text `Webhook verification failed`.

**Handled events:** `user.created`, `user.updated`, `user.deleted` (other types ignored).

| Event | Behaviour |
|-------|-----------|
| `user.created` | If no user with `clerkId`: create `Firm` + `User` (`OWNER`) |
| `user.updated` | `updateMany` user by `clerkId` (name, email, phone, avatar) |
| `user.deleted` | `deleteMany` users by `clerkId` |

**Success response:** `{ received: true }` (200) — **not** the `{ data, error }` envelope.

**Status codes:** 200, 400 (verification), 500 (`Webhook handler error` plain text)

---

## Enums

### ProjectType
`RESIDENTIAL` | `COMMERCIAL` | `INDUSTRIAL` | `INTERIOR` | `LANDSCAPE` | `INSTITUTIONAL`

### ProjectStage
`CONCEPT` | `SCHEMATIC` | `DESIGN_DEV` | `WORKING_DRAWINGS` | `EXECUTION` | `COMPLETED`

### ProjectStatus
`ACTIVE` | `ON_HOLD` | `COMPLETED` | `CANCELLED`

### DrawingType
`PLAN` | `ELEVATION` | `SECTION` | `RENDER` | `BOQ` | `DETAIL` | `OTHER`

### DrawingStatus
`PENDING_REVIEW` | `APPROVED` | `REVISION_REQUESTED`

### MilestoneStatus
`UPCOMING` | `DUE` | `UNPAID` | `PAID` | `OVERDUE`

### InvoiceStatus
`DRAFT` | `UNPAID` | `PAID` | `OVERDUE` | `CANCELLED`

### LeadSource
`REFERRAL` | `INSTAGRAM` | `FACEBOOK` | `WALKIN` | `WEBSITE` | `HOUZZ` | `PHONE` | `OTHER`

### LeadStage
`NEW` | `CONTACTED` | `SITE_VISIT` | `PROPOSAL_SENT` | `NEGOTIATION` | `WON` | `LOST`

### ActivityType
`CALL` | `EMAIL` | `WHATSAPP` | `SITE_VISIT` | `PROPOSAL` | `NOTE` | `STAGE_CHANGE`

### VendorCategory
`CONTRACTOR` | `TILES` | `STEEL` | `WOOD` | `GLASS` | `ELECTRICAL` | `PLUMBING` | `PAINT` | `HARDWARE` | `FURNITURE` | `LANDSCAPING` | `OTHER`

### UserRole
`OWNER` | `ARCHITECT` | `DRAFTSMAN` | `SITE_MANAGER` | `ADMIN`

### IssueSeverity
`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

### IssueStatus
`OPEN` | `IN_PROGRESS` | `RESOLVED` | `CLOSED`

### ClientDecisionOutcome
`APPROVED` | `REJECTED`

### ClientNudgeChannel
`EMAIL` | `WHATSAPP`

### ClientNudgeStatus
`QUEUED` | `SENT` | `FAILED`
