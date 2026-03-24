# ArchDesk — API Reference

> All endpoints require Clerk authentication unless marked Public.
> Response shape: `{ data: T | null, error: string | null }`

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

**Status codes:** 200, 401 (no session), 404 (user not found), 500

---

### `POST /api/projects`

**Auth:** Required (Clerk session)
**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `clientId` | string | Yes | Client ID (must belong to same firm) |
| `type` | `ProjectType` | Yes | RESIDENTIAL, COMMERCIAL, etc. |
| `budget` | number | No | Budget in INR |
| `area` | number | No | Area in sqft |
| `location` | string | No | Project location |
| `startDate` | string | No | ISO date |
| `deadline` | string | No | ISO date |
| `description` | string | No | Project description |

**Response:** `{ data: ProjectWithRelations, error: null }` (status 201)

The creating user is automatically added as a team member with role "Lead Architect".

**Status codes:** 201 (created), 400 (missing fields), 401, 404 (client not found), 500

---

### `GET /api/projects/[id]`

**Auth:** Required (Clerk session)
**Path params:** `id` — Project ID

**Response:** `{ data: ProjectWithRelations, error: null }`

Returns project with client, team members, and counts. Only returns projects belonging to the authenticated user's firm.

**Status codes:** 200, 401, 404 (project not found or wrong firm), 500

---

### `PATCH /api/projects/[id]`

**Auth:** Required (Clerk session)
**Path params:** `id` — Project ID
**Request body:** (all optional)
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Project name |
| `description` | string | Description |
| `stage` | `ProjectStage` | Current stage |
| `status` | `ProjectStatus` | Active, On Hold, etc. |
| `budget` | number | Budget in INR |
| `area` | number | Area in sqft |
| `location` | string | Location |

**Response:** `{ data: ProjectWithRelations, error: null }`

**Status codes:** 200, 401, 404 (not found or wrong firm), 500

---

## Enums

### ProjectType
`RESIDENTIAL` | `COMMERCIAL` | `INDUSTRIAL` | `INTERIOR` | `LANDSCAPE` | `INSTITUTIONAL`

### ProjectStage
`CONCEPT` | `SCHEMATIC` | `DESIGN_DEV` | `WORKING_DRAWINGS` | `EXECUTION` | `COMPLETED`

### ProjectStatus
`ACTIVE` | `ON_HOLD` | `COMPLETED` | `CANCELLED`
