"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Building2,
  IndianRupee,
  TrendingUp,
  Layers,
  MapPin,
  Loader2,
  Download,
  FolderPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatINR, formatINRShort } from "@/lib/utils";
import type { CostEstimateResult } from "@/app/api/ai/cost-estimate/route";
import type { ApiResponse } from "@/types";

const PROJECT_TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "INTERIOR", label: "Interior" },
  { value: "LANDSCAPE", label: "Landscape" },
  { value: "INSTITUTIONAL", label: "Institutional" },
] as const;

const LOCATION_SUGGESTIONS = [
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Hubballi",
  "Tier-2 city",
  "Rural Karnataka",
];

const BAR_PALETTE = [
  "bg-amber-500/90",
  "bg-violet-500/85",
  "bg-sky-500/85",
  "bg-emerald-500/85",
  "bg-rose-500/80",
  "bg-primary/90",
  "bg-cyan-500/80",
  "bg-fuchsia-500/75",
  "bg-lime-500/70",
  "bg-orange-500/85",
];

const INTERIOR_BAR_PALETTE = [
  "bg-primary/80",
  "bg-amber-400/80",
  "bg-violet-400/80",
  "bg-sky-400/80",
  "bg-emerald-400/80",
];

const DONUT_COLORS = [
  "hsl(38 90% 54%)",
  "hsl(265 85% 58%)",
  "hsl(199 89% 48%)",
  "hsl(152 72% 42%)",
  "hsl(340 82% 55%)",
  "hsl(43 96% 56%)",
  "hsl(187 85% 45%)",
  "hsl(292 72% 52%)",
  "hsl(82 78% 44%)",
  "hsl(24 95% 53%)",
];

type Quality = "standard" | "premium" | "luxury";

export default function AIEstimatorPage() {
  const [projectType, setProjectType] = useState<string>("RESIDENTIAL");
  const [area, setArea] = useState<string>("2500");
  const [quality, setQuality] = useState<Quality>("premium");
  const [location, setLocation] = useState<string>("Bengaluru");
  const [floors, setFloors] = useState<string>("2");
  const [includeInterior, setIncludeInterior] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CostEstimateResult | null>(null);
  const [barPhase, setBarPhase] = useState(false);

  const areaNum = useMemo(() => {
    const n = parseFloat(area.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [area]);

  const floorsNum = useMemo(() => {
    const n = parseInt(floors, 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }, [floors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBarPhase(false);

    if (!areaNum || !location.trim()) {
      setError("Enter a valid area and location.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/cost-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType,
          area: areaNum,
          quality,
          location: location.trim(),
          floors: floorsNum,
          includeInterior,
        }),
      });
      const json = (await res.json()) as ApiResponse<CostEstimateResult>;
      if (!res.ok || json.error || !json.data) {
        setError(json.error ?? "Could not generate estimate.");
        return;
      }
      setResult(json.data);
      requestAnimationFrame(() => setBarPhase(true));
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const maxSlice = result
    ? Math.max(
        ...result.breakdown.map((b) => b.amount),
        ...(result.interiorBreakdown?.map((b) => b.amount) ?? [0])
      )
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Calculator className="h-5 w-5 opacity-90" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">
              ArchDesk Intelligence
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Calculator className="h-7 w-7 text-primary" />
            Construction cost estimator
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Deterministic Indian market bands by city, typology, and quality — tuned for architecture
            practices pitching feasibility in minutes.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Inputs */}
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Project inputs
            </CardTitle>
            <CardDescription>All figures use indicative all-India construction brackets.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Project type</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger className="border-border bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Built-up area (sq ft)</Label>
                <Input
                  id="area"
                  inputMode="decimal"
                  className="border-border bg-background"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. 3200"
                />
              </div>

              <div className="space-y-3">
                <Label>Quality</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["standard", "Standard"],
                      ["premium", "Premium"],
                      ["luxury", "Luxury"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuality(value)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-center text-xs font-medium transition-all",
                        quality === value
                          ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Location (city)
                </Label>
                <Input
                  id="location"
                  list="city-suggestions"
                  className="border-border bg-background"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Start typing a city…"
                />
                <datalist id="city-suggestions">
                  {LOCATION_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floors" className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Floors
                </Label>
                <Input
                  id="floors"
                  type="number"
                  min={1}
                  className="border-border bg-background"
                  value={floors}
                  onChange={(e) => setFloors(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Include interior fit-out</p>
                  <p className="text-xs text-muted-foreground">
                    False ceiling, kitchen, wardrobes, furniture, lighting bands
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeInterior}
                  onClick={() => setIncludeInterior((v) => !v)}
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
                    includeInterior
                      ? "border-primary bg-primary/20"
                      : "border-border bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-primary shadow transition-all",
                      includeInterior ? "left-6 bg-primary" : "left-0.5 bg-muted-foreground/50"
                    )}
                  />
                </button>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Computing estimate…
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Generate estimate
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="relative overflow-hidden border-border/60 bg-card shadow-md">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />

          <CardHeader className="relative border-b border-border/50 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  Estimate snapshot
                </CardTitle>
                <CardDescription>
                  {result
                    ? `${formatINRShort(result.summary.grandTotal)} all-in indicative total`
                    : "Run the calculator to see a full breakdown."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border"
                  disabled={!result}
                  onClick={() => {
                    /* placeholder — PDF / sheet export */
                  }}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download estimate
                </Button>
                <Button type="button" size="sm" className="bg-primary text-primary-foreground" asChild>
                  <Link href="/projects">
                    <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                    Create project from estimate
                  </Link>
                </Button>
              </div>
            </div>

            {result && (
              <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 to-transparent p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Grand total (incl. GST)
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
                    {formatINR(result.summary.grandTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatINRShort(result.summary.grandTotal)} · {result.timeline}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Subtotal (ex-GST)
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {formatINR(result.summary.totalCost)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    GST @ 18%: {formatINR(result.summary.gstAmount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Effective / sq ft
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {formatINR(result.summary.costPerSqFt)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rate band {formatINR(result.rateRange.min)} – {formatINR(result.rateRange.max)} / sq ft
                  </p>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="relative space-y-6 pt-6">
            {!result && !loading && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-background/40 p-8 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground/40" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  Configure your project on the left and generate a board-ready cost narrative with live
                  allocation bars.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Synthesizing rates and location multipliers…</p>
              </div>
            )}

            {result && (
              <>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Cost allocation</h3>
                  <div className="space-y-3">
                    {result.breakdown.map((row, i) => {
                      const pctOfMax = maxSlice > 0 ? (row.amount / maxSlice) * 100 : 0;
                      const width = barPhase ? pctOfMax : 0;
                      return (
                        <div key={row.category} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-foreground">{row.category}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {row.percentage}% · {formatINR(row.amount)}
                            </span>
                          </div>
                          <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary/80">
                            <div
                              className={cn(
                                "h-full rounded-full transition-[width] duration-700 ease-out",
                                BAR_PALETTE[i % BAR_PALETTE.length]
                              )}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {result.interiorBreakdown && result.interiorBreakdown.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Interior fit-out</h3>
                    <div className="space-y-3">
                      {result.interiorBreakdown.map((row, i) => {
                        const pctOfMax = maxSlice > 0 ? (row.amount / maxSlice) * 100 : 0;
                        const width = barPhase ? pctOfMax : 0;
                        return (
                          <div key={row.category} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-foreground">{row.category}</span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {formatINR(row.amount)}
                              </span>
                            </div>
                            <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary/80">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-[width] duration-700 ease-out",
                                  INTERIOR_BAR_PALETTE[i % INTERIOR_BAR_PALETTE.length]
                                )}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pie-style ring using conic-gradient from breakdown */}
                <div className="grid gap-4 md:grid-cols-[minmax(0,140px)_1fr] md:items-center">
                  <div className="relative mx-auto h-36 w-36 shrink-0">
                    <div
                      className="absolute inset-0 rounded-full shadow-md ring-1 ring-border/50"
                      style={{
                        backgroundImage: (() => {
                          const total = result.breakdown.reduce((s, b) => s + b.amount, 0) || 1;
                          let acc = 0;
                          const stops = result.breakdown.map((b, i) => {
                            const startPct = (acc / total) * 100;
                            acc += b.amount;
                            const endPct = (acc / total) * 100;
                            return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${startPct}% ${endPct}%`;
                          });
                          return `conic-gradient(from -90deg, ${stops.join(", ")})`;
                        })(),
                      }}
                    />
                    <div className="absolute inset-[14px] flex items-center justify-center rounded-full bg-card text-center shadow-inner ring-1 ring-border/60">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Used rate
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-primary">
                          {formatINR(result.rateRange.used)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">/ sq ft</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Assumptions</h3>
                    <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                      {result.assumptions.map((a) => (
                        <li key={a} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
