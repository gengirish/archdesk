---
related_docs:
  - docs/API.md: endpoints that use these models
  - docs/FEATURES.md: features backed by these models

sources:
  - prisma/schema.prisma: Prisma schema (single source of truth)
---

# ArchDesk — Database Schema Reference

> PostgreSQL via Prisma ORM. 19 models, 19 enums.
> Every query scopes to `firmId` for multi-tenant isolation.

---

## Models

### Firm
Tenant root — every user, client, project, lead, and vendor belongs to a firm.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| name | String | Firm name |
| logo | String? | Logo URL |
| gstNumber | String? | GST registration number |
| phone | String | Contact phone |
| email | String | Contact email |
| address | String? | Office address |
| city | String | Default: "Hubballi" |
| state | String | Default: "Karnataka" |
| brandColor | String | Default: "#E8A045" |
| website | String? | Firm website |

**Relations:** users[], clients[], projects[], leads[], vendors[]

---

### User
Staff member linked to Clerk auth via `clerkId`.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| clerkId | String | Unique, maps to Clerk user |
| firmId | String | FK → Firm |
| name | String | Display name |
| email | String | Email address |
| phone | String? | Phone number |
| role | UserRole | Default: ARCHITECT |
| avatar | String? | Avatar URL |

**Enum UserRole:** `OWNER` | `ARCHITECT` | `DRAFTSMAN` | `SITE_MANAGER` | `ADMIN`

---

### Client

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| firmId | String | FK → Firm |
| name | String | Client name |
| phone | String | Indian mobile (+91) |
| email | String? | Email |
| address | String? | Address |
| city | String? | City |
| notes | String? | Free-text notes |

**Relations:** projects[]

---

### Project

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| firmId | String | FK → Firm |
| clientId | String | FK → Client |
| name | String | Project name |
| description | String? | Description |
| type | ProjectType | Residential, Commercial, etc. |
| stage | ProjectStage | Default: CONCEPT |
| status | ProjectStatus | Default: ACTIVE |
| budget | Float? | Budget in INR |
| area | Float? | Area in sqft |
| location | String? | Site location |
| startDate | DateTime? | Start date |
| deadline | DateTime? | Deadline |
| clientToken | String | Unique cuid for portal access |

**Relations:** team[], drawings[], floorPlans[], flatScenes[], milestones[], clientDecisions[], clientNudges[], siteUpdates[], issues[]

**Enum ProjectType:** `RESIDENTIAL` | `COMMERCIAL` | `INDUSTRIAL` | `INTERIOR` | `LANDSCAPE` | `INSTITUTIONAL`

**Enum ProjectStage:** `CONCEPT` | `SCHEMATIC` | `DESIGN_DEV` | `WORKING_DRAWINGS` | `EXECUTION` | `COMPLETED`

**Enum ProjectStatus:** `ACTIVE` | `ON_HOLD` | `COMPLETED` | `CANCELLED`

---

### ProjectMember

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| userId | String | FK → User |
| role | String | Default: "Architect" |

**Constraint:** Unique on [projectId, userId]

---

### Drawing

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| name | String | Drawing name |
| type | DrawingType | Plan, Elevation, etc. |
| fileUrl | String | Supabase storage URL |
| fileSize | Int? | Bytes |
| mimeType | String? | File MIME type |
| version | Int | Default: 1 |
| status | DrawingStatus | Default: PENDING_REVIEW |
| uploadedById | String? | Uploader user ID |

**Relations:** versions[], comments[]

**Enum DrawingType:** `PLAN` | `ELEVATION` | `SECTION` | `RENDER` | `BOQ` | `DETAIL` | `OTHER`

**Enum DrawingStatus:** `PENDING_REVIEW` | `APPROVED` | `REVISION_REQUESTED`

---

### DrawingVersion

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| drawingId | String | FK → Drawing |
| version | Int | Version number |
| fileUrl | String | Storage URL |
| fileSize | Int? | Bytes |
| note | String? | Version note |

---

### DrawingComment

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| drawingId | String | FK → Drawing |
| userId | String? | FK → User (null for client comments) |
| clientName | String? | Name for client comments |
| content | String | Comment text |
| isClient | Boolean | Default: false |

---

### FloorPlan

Canonical 2D floor-plan geometry for 3D conversion.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| name | String | Floor plan label |
| sourceType | FloorPlanSourceType | Default: `MANUAL` |
| unit | String | Default: `mm` |
| scale | Float | Default: `1` |
| wallHeight | Float | Default: `3000` |
| wallThickness | Float | Default: `200` |
| planJson | Json | Normalized 2D geometry (polygon + wall segments) |
| createdAt | DateTime | Default now() |
| updatedAt | DateTime | Auto-updated |

**Relations:** scenes[]

**Enum FloorPlanSourceType:** `MANUAL` | `DXF` | `PDF` | `IMAGE`

---

### FlatScene

Generated or manually authored 3D scene payload for Babylon.js rendering.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| floorPlanId | String? | Optional FK → FloorPlan |
| name | String | Scene name |
| status | FlatSceneStatus | Default: `DRAFT` |
| sceneJson | Json | Render payload consumed by 3D viewer |
| generationMeta | Json? | Generator metadata (version, timestamps, etc.) |
| createdAt | DateTime | Default now() |
| updatedAt | DateTime | Auto-updated |

**Enum FlatSceneStatus:** `DRAFT` | `GENERATED` | `FAILED`

---

### Milestone

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| name | String | Milestone name |
| description | String? | Description |
| stage | ProjectStage | Linked project stage |
| amount | Float | Base amount before GST |
| gstPercent | Float | Default: 18 |
| dueDate | DateTime? | Due date |
| razorpayLinkId | String? | Razorpay link ID |
| razorpayLinkUrl | String? | Payment link URL |
| status | MilestoneStatus | Default: UPCOMING |
| paidAt | DateTime? | Payment date |
| paidAmount | Float? | Amount received |
| clientDecisionOpen | Boolean | Default: false; toggles client approval request visibility in portal |
| clientDecisionOpenedAt | DateTime? | Timestamp when client decision request was opened (used for response-time analytics) |

**Relations:** invoices[], clientDecisions[], clientNudges[]

**Enum MilestoneStatus:** `UPCOMING` | `DUE` | `UNPAID` | `PAID` | `OVERDUE`

---

### Invoice

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| milestoneId | String | FK → Milestone |
| invoiceNo | String | Unique (e.g. ARC-2026-001) |
| baseAmount | Float | Before GST |
| gstAmount | Float | GST component |
| totalAmount | Float | Base + GST |
| pdfUrl | String? | Generated PDF URL |
| notes | String? | Invoice notes |
| status | InvoiceStatus | Default: UNPAID |
| paidAt | DateTime? | Payment date |
| razorpayPaymentId | String? | Payment ID |
| razorpayOrderId | String? | Order ID |

**Enum InvoiceStatus:** `DRAFT` | `UNPAID` | `PAID` | `OVERDUE` | `CANCELLED`

---

### ClientDecision

Client response log for milestone decision requests initiated by the firm and submitted via client portal token.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| milestoneId | String | FK → Milestone |
| outcome | ClientDecisionOutcome | `APPROVED` or `REJECTED` |
| comment | String | Required decision note |
| costDeltaAmount | Float? | Optional quoted impact in INR |
| costDeltaNote | String? | Optional explanation for delta |
| respondentName | String? | Optional client name entered at submit time |
| createdAt | DateTime | Default now() |

**Indexes:** `[projectId, createdAt]`, `[milestoneId, createdAt]`

**Enum ClientDecisionOutcome:** `APPROVED` | `REJECTED`

---

### ClientNudge

Delivery audit log for staff-triggered reminder nudges on open client decision requests.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| milestoneId | String | FK → Milestone |
| requestedById | String? | FK → User |
| channel | ClientNudgeChannel | `EMAIL` or `WHATSAPP` |
| status | ClientNudgeStatus | `QUEUED`, `SENT`, or `FAILED` |
| provider | String | Provider identifier (`resend`, `whatsapp-provider-stub`, etc.) |
| providerMessageId | String? | Provider message/event ID |
| idempotencyKey | String? | Provider idempotency key (if used) |
| message | String? | Optional custom nudge message |
| errorMessage | String? | Provider-level error when failed |
| metadata | Json? | Client and portal metadata snapshot |
| sentAt | DateTime? | Set when status is `SENT` |
| createdAt | DateTime | Default now() |
| updatedAt | DateTime | Auto-updated |

**Indexes:** `[projectId, createdAt]`, `[milestoneId, createdAt]`, `[status, createdAt]`

**Enum ClientNudgeChannel:** `EMAIL` | `WHATSAPP`

**Enum ClientNudgeStatus:** `QUEUED` | `SENT` | `FAILED`

---

### SiteUpdate

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| userId | String? | FK → User |
| note | String? | Update text |
| photos | String[] | Supabase storage URLs |
| milestone | ProjectStage? | Current construction stage |
| weather | String? | Weather conditions |

---

### SiteIssue

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| projectId | String | FK → Project |
| title | String | Issue title |
| description | String? | Details |
| photos | String[] | Photo URLs |
| severity | IssueSeverity | Default: MEDIUM |
| status | IssueStatus | Default: OPEN |
| assignedTo | String? | Assigned team member |
| resolvedAt | DateTime? | Resolution date |

**Enum IssueSeverity:** `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

**Enum IssueStatus:** `OPEN` | `IN_PROGRESS` | `RESOLVED` | `CLOSED`

---

### Lead

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| firmId | String | FK → Firm |
| name | String | Lead name |
| phone | String | Phone number |
| email | String? | Email |
| address | String? | Address |
| projectType | ProjectType? | Interested project type |
| budget | Float? | Estimated budget |
| area | Float? | Estimated area (sqft) |
| source | LeadSource | Default: OTHER |
| stage | LeadStage | Default: NEW |
| notes | String? | Notes |
| followUpAt | DateTime? | Follow-up date |
| convertedProjectId | String? | Linked project if won |

**Relations:** activities[]

**Enum LeadSource:** `REFERRAL` | `INSTAGRAM` | `FACEBOOK` | `WALKIN` | `WEBSITE` | `HOUZZ` | `PHONE` | `OTHER`

**Enum LeadStage:** `NEW` | `CONTACTED` | `SITE_VISIT` | `PROPOSAL_SENT` | `NEGOTIATION` | `WON` | `LOST`

---

### LeadActivity

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| leadId | String | FK → Lead |
| userId | String? | FK → User |
| type | ActivityType | Call, Email, etc. |
| note | String? | Activity note |

**Enum ActivityType:** `CALL` | `EMAIL` | `WHATSAPP` | `SITE_VISIT` | `PROPOSAL` | `NOTE` | `STAGE_CHANGE`

---

### Vendor

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid, PK |
| firmId | String | FK → Firm |
| name | String | Vendor name |
| category | VendorCategory | Contractor, Tiles, etc. |
| phone | String | Phone number |
| email | String? | Email |
| address | String? | Address |
| city | String | Default: "Hubballi" |
| gst | String? | GST number |
| notes | String? | Notes |
| rating | Int? | 1–5 stars |

**Enum VendorCategory:** `CONTRACTOR` | `TILES` | `STEEL` | `WOOD` | `GLASS` | `ELECTRICAL` | `PLUMBING` | `PAINT` | `HARDWARE` | `FURNITURE` | `LANDSCAPING` | `OTHER`
