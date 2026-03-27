---
related_docs:
  - docs/FEATURES.md: features being built by agents

sources:
  - components/three-d/: Babylon UX agent scope
  - app/(dashboard)/3d-studio/: 3D Studio pages
  - app/api/projects/: project API routes
  - lib/flat-scene-generator.ts: geometry engine
  - prisma/schema.prisma: data models
  - e2e/: test coverage
  - docs/contracts/: integration contracts
---

# ArchDesk — Parallel Multi-Agent Implementation (Cursor)

## Goal

Ship YC-worthy 3D Studio capabilities quickly by splitting implementation into parallel, low-conflict workstreams that can be executed by multiple Cursor agents at the same time.

This document is a concrete operating plan, not a high-level idea list.

---

## Scope (Phase 1: 4-6 weeks)

Build these production features in parallel:

1. Floor plan ingestion and normalization (`DXF` + manual correction)
2. Babylon.js editing UX (walls/openings/materials/camera modes)
3. Cost-linked design decisions (room/material cost delta)
4. Client option compare + approval in portal
5. Automation and analytics wiring (approval -> billing)
6. E2E hardening and deployment gates

---

## Team Topology (Parallel Agents)

Use 6 Cursor agents in parallel. Each agent owns a bounded area:

1. **Agent A — Geometry Engine**
   - Owns floor-plan parsing, normalization, validation, and rule-based 2D -> 3D conversion logic.
2. **Agent B — Babylon UX**
   - Owns canvas rendering, gizmos, snapping, camera controls, editing interactions.
3. **Agent C — API + DB**
   - Owns Prisma models, API routes, auth scoping, schema/versioning.
4. **Agent D — Cost/BOQ**
   - Owns material catalogs, cost engine, BOQ generation API and export payloads.
5. **Agent E — Portal + Decisions**
   - Owns client option compare UI, approve/reject workflow, decision metadata.
6. **Agent F — QA/Release**
   - Owns Playwright coverage, smoke/regression packs, deploy verification scripts.

---

## Branch Strategy

Create one integration branch and one branch per agent:

- `feat/3d-studio-integration` (shared integration branch)
- `feat/3d-geometry`
- `feat/3d-babylon-ux`
- `feat/3d-api-db`
- `feat/3d-cost-boq`
- `feat/3d-portal-decisions`
- `feat/3d-qa-release`

Rules:
- Agents never commit directly to `master`.
- Each agent rebases/merges from `feat/3d-studio-integration` daily.
- Integration happens via small PRs (<= 600 lines where possible).

---

## File Ownership to Reduce Merge Conflicts

Assign temporary ownership by path:

- **Geometry:** `lib/flat-scene-generator.ts`, `lib/geometry/**`
- **Babylon UX:** `components/three-d/**`, `app/(dashboard)/3d-studio/**`
- **API + DB:** `prisma/schema.prisma`, `app/api/projects/**/floor-plans/**`, `app/api/projects/**/flat-scenes/**`
- **Cost/BOQ:** `lib/cost/**`, `app/api/projects/**/boq/**`, `app/api/projects/**/cost/**`
- **Portal:** `app/portal/**`, `app/api/portal/**`
- **QA:** `e2e/**`, `playwright*.ts`, CI workflow files

Any cross-path change requires a quick contract sync (see below).

---

## Contract-First Integration

Before agents code, freeze these contracts:

1. `FloorPlan.planJson` schema
2. `FlatScene.sceneJson` schema
3. Cost delta API response shape
4. Portal option comparison payload

Create these contract docs first:

- `docs/contracts/floor-plan-json.md`
- `docs/contracts/flat-scene-json.md`
- `docs/contracts/cost-delta-api.md`
- `docs/contracts/portal-options-api.md`

No agent changes contract fields without updating docs + notifying all agents.

---

## Execution Phases

## Phase 0 (Day 1): Alignment

- Freeze schemas and API contracts.
- Seed one canonical demo project for 3D regression tests.
- Add baseline e2e smoke for `/3d-studio`.

Exit criteria:
- All agents agree on payload shape.
- Baseline tests pass in CI.

## Phase 1 (Week 1-2): Core Functionality in Parallel

- Agent A: DXF/manual normalization and geometry validation warnings.
- Agent B: scene editing controls + wall/opening interaction.
- Agent C: CRUD + generation + versioning routes with firm scoping.
- Agent D: material catalog + cost delta service.
- Agent E: portal option cards (A/B/C) with decision persistence.
- Agent F: add suite for APIs and authenticated route behavior.

Exit criteria:
- User can create plan, generate scene, edit materials, see cost delta.

## Phase 2 (Week 3-4): Workflow Monetization

- Decision approval links to billing milestone updates.
- BOQ draft generated from selected option.
- Analytics events emitted for revision count and approval time.

Exit criteria:
- Approval action triggers business workflow end-to-end.

## Phase 3 (Week 5-6): Reliability + Demo Hardening

- Performance passes on representative project sizes.
- Error recovery + empty states + retry UX.
- E2E full green on production URL.

Exit criteria:
- Investor/demo script is deterministic and stable.

---

## Cursor Agent Prompts (Copy/Paste Ready)

Use these prompts to launch agents in parallel.

### Agent A (Geometry)

```
Implement floor-plan normalization and validation in ArchDesk.
Focus only on geometry modules and related unit tests.
Honor existing planJson/sceneJson contracts from docs/contracts.
Do not modify portal or billing files.
Return: files changed, API/schema impacts, tests run, and known limitations.
```

### Agent B (Babylon UX)

```
Implement 3D Studio interaction UX (camera modes, snapping, wall/opening manipulation, material assignment).
Work only in components/three-d and app/(dashboard)/3d-studio.
Use existing APIs; do not edit Prisma schema.
Return: interaction list completed, keyboard shortcuts, performance notes, and tests.
```

### Agent C (API + DB)

```
Implement and harden Prisma/API layer for floor plans, flat scenes, and scene versioning.
Enforce Clerk auth and firmId scoping on every route.
Work only in prisma schema and app/api related files.
Return: migration/schema details, endpoint contract summary, and auth checks implemented.
```

### Agent D (Cost/BOQ)

```
Implement cost delta engine and BOQ generation for material and geometry changes.
Expose project-scoped APIs and typed response envelopes.
Do not modify Babylon rendering code.
Return: formula assumptions, API endpoints, and validation/test coverage.
```

### Agent E (Portal Decisions)

```
Implement client option compare and approval UX in portal.
Add option cards, decision metadata, and cost/timeline display.
Integrate with existing decision endpoints.
Return: UX states, payload fields consumed, and analytics events emitted.
```

### Agent F (QA/Release)

```
Implement Playwright and CI coverage for new 3D Studio workflows.
Include unauth API checks, authenticated page flows, and portal decision path.
Run against production BASE_URL and report pass/fail matrix.
Return: test files, flaky risks, and release checklist status.
```

---

## Daily Integration Protocol

Run this daily:

1. Each agent opens PR to `feat/3d-studio-integration`.
2. QA agent runs:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test:e2e:public`
   - `BASE_URL=<preview-url> npm run test:e2e`
3. Resolve conflicts immediately, especially:
   - `prisma/schema.prisma`
   - contract docs
   - shared hooks and types
4. Deploy preview and post verification summary in PR.

---

## Acceptance Criteria (YC Demo Ready)

Must pass all:

- User creates/imports floor plan, generates 3D scene, edits design.
- Material changes show room/flat cost impact instantly.
- Client compares options in portal and approves one.
- Approval updates downstream billing/decision workflow.
- E2E suite passes on production URL.
- Demo flow works with seeded data in under 5 minutes without manual DB fixes.

---

## Risk Controls

- Keep scene payload versioned with `schemaVersion`.
- Add migration adapters when payload shape changes.
- Record source-of-truth decisions in contract docs, not chat threads.
- Avoid giant PRs; integrate incrementally.

---

## Immediate Next Actions

1. Create the 7 branches listed above.
2. Create `docs/contracts/*` files and lock v1 payload contracts.
3. Launch Agents A-F in parallel with the prompts in this file.
4. Timebox first merge cycle to 48 hours.

