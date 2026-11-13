# ArchDesk

Architecture & Design Project Management SaaS for Tier-2 Indian Cities.

Powered by [IntelliForge AI](https://www.intelliforge.tech/)

---

## Overview

ArchDesk is a vertical SaaS platform purpose-built for architecture and interior design firms in Tier-2 Indian cities, starting with Hubballi-Dharwad, Karnataka. It replaces fragmented workflows of WhatsApp, Excel, and manual invoicing with a single unified platform.

**Target users:** Firm owners, architects, draftsmen, site managers, and their clients.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Clerk (multi-tenant orgs) |
| Database | Prisma ORM + Supabase Postgres |
| File Storage | Supabase Storage |
| Payments | Razorpay (UPI, cards, net banking) |
| Email | Resend |
| PDF | @react-pdf/renderer |
| State | Zustand (client) + TanStack Query (server) |
| Deployment | Vercel + Fly.io (Mumbai region) |

## Getting Started

```bash
# Install dependencies
npm install

# Use Node 20 (see .nvmrc)
nvm use

# Set up environment variables
cp .env.example .env.local

# Push database schema
npm run db:push

# Run development server
npm run dev
```

## India-First Features

- **INR Billing** — Lakh/crore formatting (₹1,05,000)
- **GST Invoicing** — 18% CGST + SGST breakup
- **UPI Payments** — Razorpay with UPI as primary method
- **DD/MM/YYYY** — Indian date format throughout
- **+91 Phone** — 10-digit Indian mobile validation

## Project Structure

```
app/
  (dashboard)/     # Protected dashboard routes
  api/             # API route handlers
  sign-in/         # Clerk sign-in
  sign-up/         # Clerk sign-up
components/
  layout/          # Sidebar, TopBar
  ui/              # shadcn/ui primitives
lib/               # Utilities (db, supabase, razorpay)
prisma/            # Schema and migrations
types/             # Shared TypeScript types
docs/              # Feature, API, schema and ICP docs
e2e/               # Playwright E2E tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run Next.js lint checks |
| `npm run typecheck` | Run TypeScript compile checks (`--noEmit`) |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:public` | Run public/unauthenticated Playwright suites |

## CI

GitHub Actions runs on every push and pull request to `master`:

- `npm run db:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e:public` (Chromium smoke suite)

## Deployment

| Platform | URL | Region |
|----------|-----|--------|
| Vercel | https://archdesk.vercel.app | Edge (global) |
| Fly.io | https://archdesk.fly.dev | Mumbai (bom) |
| GitHub | https://github.com/gengirish/archdesk | — |

---

Built by [Girish Hiremath](https://github.com/gengirish) · Powered by [IntelliForge AI](https://www.intelliforge.tech/)
