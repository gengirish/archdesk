import Link from "next/link";
import {
  Building2,
  PenTool,
  FileText,
  BarChart3,
  Users,
  ArrowRight,
  Ruler,
  IndianRupee,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Project Tracker",
    desc: "Manage projects from concept to completion with stage-based tracking",
  },
  {
    icon: PenTool,
    title: "Drawing Management",
    desc: "Upload, version, and review CAD drawings with client commenting",
  },
  {
    icon: IndianRupee,
    title: "Milestone Billing",
    desc: "GST-ready invoicing with Razorpay payment links and UPI support",
  },
  {
    icon: FileText,
    title: "Site Updates",
    desc: "Log daily site progress with photos, weather notes, and issues",
  },
  {
    icon: Users,
    title: "Leads CRM",
    desc: "Track enquiries from Instagram, referrals, and walk-ins to conversion",
  },
  {
    icon: BarChart3,
    title: "Firm Dashboard",
    desc: "Revenue analytics, pending approvals, and project pipeline at a glance",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Ruler className="h-6 w-6 text-primary" />
            <span className="text-lg font-medium tracking-tight text-foreground">
              ArchDesk
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-border/60 bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
            Built for architects in Hubballi, Karnataka
          </div>
          <h1 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Run your architecture firm{" "}
            <span className="text-primary">from one desk</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Projects, drawings, billing, site updates, and client communication
            — all in one place. Designed for how Indian architecture firms
            actually work.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              Everything your firm needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Purpose-built tools for architecture and interior design workflows
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-lg border border-border/50 bg-card p-6 transition-colors hover:border-primary/30"
              >
                <div className="mb-4 inline-flex rounded-md bg-primary/10 p-2.5">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-sm font-medium text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Indian market callout */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-8 sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-medium tracking-tight text-foreground">
                Made for Indian architects
              </h2>
              <div className="mt-6 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-md border border-border/50 bg-card p-4">
                  <div className="mb-1 font-medium text-foreground">GST Invoicing</div>
                  18% CGST + SGST breakup on every invoice
                </div>
                <div className="rounded-md border border-border/50 bg-card p-4">
                  <div className="mb-1 font-medium text-foreground">UPI Payments</div>
                  Razorpay with UPI, cards, and net banking
                </div>
                <div className="rounded-md border border-border/50 bg-card p-4">
                  <div className="mb-1 font-medium text-foreground">INR Billing</div>
                  Lakh/crore formatting throughout the app
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ruler className="h-4 w-4" />
              ArchDesk
            </div>
            <p className="text-xs text-muted-foreground">
              Built for Tier-2 India &middot; Hubballi, Karnataka
            </p>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-border/30 pt-4">
            <span className="text-[11px] text-muted-foreground/60">
              Powered by
            </span>
            <a
              href="https://www.intelliforge.tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-muted-foreground/80 transition-colors hover:text-primary"
            >
              IntelliForge AI
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
