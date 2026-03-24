# ArchDesk — Changelog

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
