---
required_docs:
  - docs/FEATURES.md: modules and plan tiers the ICP maps to

related_docs:
  - docs/DEMO.md: DesignCraft Studios persona used for customer interviews

sources:
  - lib/feature-tiers.ts: plan hierarchy and feature gating
  - app/page.tsx: landing page and free-trial call to action
---

# ArchDesk — Ideal Customer Profile

> Who ArchDesk should sell to first, what they struggle with, and where the current plan tiers get in the way.
>
> **Status:** Hypothesis (Rev A, 11/11/2026). Drawn from the README, feature docs, demo script and plan-tier configuration. Not yet validated with customer interviews or usage data.

---

## Primary ICP: small owner-led architecture firms in Tier-2 Karnataka cities

| Dimension | Profile |
|---|---|
| **Firm type** | Architecture practice, or architecture plus interiors |
| **Size** | 3–15 people: a principal, 1–3 architects, draftsmen, 1–2 site managers, an admin |
| **Geography** | Hubballi-Dharwad first, then Belagavi, Davangere and Mysuru |
| **Work mix** | Mostly residential (independent houses, villas, NRI clients), plus some small commercial and interiors |
| **Volume** | 8–25 live projects at once, each billed across 6 fee milestones, from retainer to completion |
| **Revenue** | About ₹40 lakh – ₹3 crore a year in fees; GST-registered |
| **Current stack** | WhatsApp groups, Excel, Tally or a CA for invoices, AutoCAD or SketchUp. No project management software |

### The buyer

The founder or principal architect, roughly 30–50 years old, who handles design, client relationships and collecting payments personally. Staff are the daily users, but the owner signs up and pays.

### Pains ArchDesk already solves

| Pain | Module that solves it |
|---|---|
| **Chasing milestone fees.** Cash flow depends on clients paying each stage on time, and follow-up is manual. | **Billing:** GST invoices with CGST/SGST split, UPI collection through Razorpay, overdue tracking |
| **Approvals lost in WhatsApp.** Drawing versions and sign-offs get buried, which leads to "I never approved that" disputes. | **Drawings and client decisions:** versioned drawings, recorded approve/reject decisions, SLA nudges when clients go quiet |
| **Clients want visibility.** NRI and out-of-town clients phone for updates the team has to compile by hand. | **Client portal and site tracker:** a no-login portal per project with stage, drawings and photo site updates |
| **Enquiries go cold.** Leads arrive by referral, Instagram or JustDial and nobody follows up consistently. | **Leads CRM:** an 8-stage pipeline with logged calls, site visits and proposals |

### Buying triggers

- Hiring the 4th or 5th person
- Running two or more active sites
- A payment dispute, or a client denying an approval
- Taking on an NRI client
- A GST filing scramble

### Where to find them

- COA (Council of Architecture) register, filtered by city
- IIA Hubballi-Dharwad centre
- CREDAI and builder associations
- Instagram portfolios
- JustDial listings for "architects in Hubballi"

---

## Secondary ICP

**Turnkey interior design studios** of 3–10 people in the same cities. The vendor directory, BOQ drawings and site tracker fit them well. They may later need procurement and material tracking.

## Don't target

- **Solo freelance architects.** The free tier covers them and they rarely convert.
- **Metro firms of 30+ people.** They already use BIM 360, Procore or Zoho and need integrations ArchDesk lacks.
- **Civil contractors and builders.** Their work runs on materials, labour and RA bills, not design-fee milestones.

---

## Where the plan tiers conflict with this ICP

See [FEATURES.md → SaaS Plan Tiers](FEATURES.md) and `lib/feature-tiers.ts`.

1. **Multi-user Teams and Client Portal are Enterprise-only.** A 3–15 person firm needs multiple users from day one, and the client portal is the strongest differentiator. Today the ICP has to buy the top plan just to work properly. Consider moving both into Pro, perhaps capped at 5 seats, and keeping White Label, API and Advanced Analytics in Enterprise.
2. **The Free tier suits solo practitioners.** 3 projects, 5 clients and no drawings works as a trial, not a plan this ICP would stay on. Point the "Start Free Trial" button in `app/page.tsx` at a time-boxed Pro trial instead.
3. **No price points are set yet.** A starting range to test in interviews: ₹1,500–3,000 a month per firm for Pro. A Tier-2 firm owner will compare that against a junior admin's salary.
4. **The app is English-only.** A Kannada option on the client portal would help with local residential clients.

---

## Next step

Run 10 interviews with Hubballi-Dharwad principal architects using the DesignCraft Studios demo ([DEMO.md](DEMO.md)). Test the four pains and willingness to pay before locking in the plan tiers. Update this doc to Rev B with the findings.
