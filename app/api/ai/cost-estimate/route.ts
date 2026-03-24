import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { calculateGST, formatINR } from "@/lib/utils";
import type { ProjectType } from "@prisma/client";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  projectType: z.enum([
    "RESIDENTIAL",
    "COMMERCIAL",
    "INDUSTRIAL",
    "INTERIOR",
    "LANDSCAPE",
    "INSTITUTIONAL",
  ]),
  area: z.number().positive().finite(),
  quality: z.enum(["standard", "premium", "luxury"]),
  location: z.string().min(1).max(200),
  floors: z.number().int().min(1).max(120).optional(),
  includeInterior: z.boolean().optional(),
});

type Quality = "standard" | "premium" | "luxury";

const RATE_TABLE: Record<ProjectType, Record<Quality, readonly [number, number]>> = {
  RESIDENTIAL: {
    standard: [1800, 2200],
    premium: [2500, 3200],
    luxury: [3500, 5000],
  },
  COMMERCIAL: {
    standard: [2200, 2800],
    premium: [3000, 4000],
    luxury: [4500, 6500],
  },
  INDUSTRIAL: {
    standard: [1200, 1600],
    premium: [1800, 2500],
    luxury: [2800, 4000],
  },
  INTERIOR: {
    standard: [800, 1200],
    premium: [1500, 2200],
    luxury: [2500, 4000],
  },
  LANDSCAPE: {
    standard: [400, 700],
    premium: [800, 1400],
    luxury: [1500, 2500],
  },
  INSTITUTIONAL: {
    standard: [2000, 2600],
    premium: [2800, 3800],
    luxury: [4000, 5500],
  },
};

const BREAKDOWN_SPEC = [
  { category: "Structure & Foundation", percentage: 30 },
  { category: "Brickwork & Masonry", percentage: 12 },
  { category: "Plumbing & Sanitary", percentage: 8 },
  { category: "Electrical & Wiring", percentage: 8 },
  { category: "Flooring & Tiling", percentage: 10 },
  { category: "Painting & Finishing", percentage: 7 },
  { category: "Doors & Windows", percentage: 8 },
  { category: "Kitchen & Bathrooms", percentage: 7 },
  { category: "Architect Fee (8%)", percentage: 8 },
  { category: "Contingency", percentage: 2 },
] as const;

function getLocationMultiplier(location: string): { mult: number; label: string } {
  const s = location.trim().toLowerCase();
  if (!s) return { mult: 1, label: "Tier-2 & other cities (default)" };

  if (s.includes("rural") || s.includes("village")) {
    return { mult: 0.85, label: "Rural" };
  }

  const mumbaiDelhi = [
    "mumbai",
    "delhi",
    "new delhi",
    "ncr",
    "gurgaon",
    "gurugram",
    "noida",
    "faridabad",
    "ghaziabad",
  ];
  if (mumbaiDelhi.some((k) => s.includes(k))) {
    return { mult: 1.3, label: "Mumbai / Delhi NCR" };
  }

  const tier1b = ["bangalore", "bengaluru", "hyderabad", "pune", "chennai"];
  if (tier1b.some((k) => s.includes(k))) {
    return { mult: 1.15, label: "Bangalore, Hyderabad, Pune, Chennai" };
  }

  return { mult: 1, label: "Tier-2 & other cities" };
}

function floorFactor(floors?: number): number {
  const f = floors && floors >= 1 ? floors : 1;
  if (f <= 1) return 1;
  return 1 + 0.06 * (f - 1);
}

function estimateTimelineMonths(area: number, floors: number): string {
  const f = floors >= 1 ? floors : 1;
  let lo: number;
  let hi: number;
  if (area < 1500) {
    lo = 5;
    hi = 9;
  } else if (area < 4000) {
    lo = 9;
    hi = 15;
  } else if (area < 10000) {
    lo = 14;
    hi = 22;
  } else {
    lo = 20;
    hi = 36;
  }
  const extra = Math.max(0, f - 1) * 2;
  return `${lo + extra}-${hi + extra} months estimated`;
}

function roundINR(n: number): number {
  return Math.round(n);
}

export type CostEstimateResult = {
  summary: {
    totalCost: number;
    costPerSqFt: number;
    gstAmount: number;
    grandTotal: number;
  };
  breakdown: { category: string; percentage: number; amount: number }[];
  interiorBreakdown?: { category: string; amount: number }[];
  timeline: string;
  rateRange: { min: number; max: number; used: number };
  assumptions: string[];
};

function buildInteriorBreakdown(interiorTotal: number): { category: string; amount: number }[] {
  const weights = [
    { category: "False Ceiling", w: 0.15 },
    { category: "Modular Kitchen", w: 0.35 },
    { category: "Wardrobes & Storage", w: 0.25 },
    { category: "Furniture", w: 0.15 },
    { category: "Lighting & Fixtures", w: 0.1 },
  ] as const;
  const raw = weights.map(({ category, w }) => ({
    category,
    amount: interiorTotal * w,
  }));
  const rounded = raw.map((x) => ({ ...x, amount: roundINR(x.amount) }));
  const drift = roundINR(interiorTotal) - rounded.reduce((s, x) => s + x.amount, 0);
  if (rounded.length && drift !== 0) {
    rounded[rounded.length - 1] = {
      ...rounded[rounded.length - 1],
      amount: rounded[rounded.length - 1].amount + drift,
    };
  }
  return rounded;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CostEstimateResult>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
        { status: 400 }
      );
    }

    const { projectType, area, quality, location, floors, includeInterior } = parsed.data;
    const { mult: locMult, label: locLabel } = getLocationMultiplier(location);
    const ff = floorFactor(floors);
    const [baseMin, baseMax] = RATE_TABLE[projectType as ProjectType][quality];

    const rateMin = roundINR(baseMin * locMult * ff);
    const rateMax = roundINR(baseMax * locMult * ff);
    const rateUsed = roundINR(((baseMin + baseMax) / 2) * locMult * ff);

    const baseConstructionTotal = roundINR(area * rateUsed);

    const breakdown: { category: string; percentage: number; amount: number }[] = [];
    let allocated = 0;
    for (let i = 0; i < BREAKDOWN_SPEC.length; i++) {
      const row = BREAKDOWN_SPEC[i];
      const isLast = i === BREAKDOWN_SPEC.length - 1;
      const amount = isLast
        ? roundINR(baseConstructionTotal - allocated)
        : roundINR((baseConstructionTotal * row.percentage) / 100);
      if (!isLast) allocated += amount;
      breakdown.push({
        category: row.category,
        percentage: row.percentage,
        amount,
      });
    }

    const interiorTotal = includeInterior ? roundINR(baseConstructionTotal * 0.18) : 0;
    const interiorBreakdown =
      includeInterior && interiorTotal > 0 ? buildInteriorBreakdown(interiorTotal) : undefined;

    const totalBeforeGst = roundINR(baseConstructionTotal + interiorTotal);
    const { gstAmount, totalAmount } = calculateGST(totalBeforeGst, 18);
    const costPerSqFt = roundINR(totalBeforeGst / area);

    const assumptions = [
      `Indicative rates for ${projectType.toLowerCase().replace(/_/g, " ")} (${quality}) in ${location.trim()}.`,
      `Ex-GST total window at band edges: ${formatINR(roundINR(area * rateMin))} – ${formatINR(roundINR(area * rateMax))} for ${new Intl.NumberFormat("en-IN").format(Math.round(area))} sq ft (before interior add-on).`,
      `Location band: ${locLabel} — ${locMult}× multiplier on base Indian market rates.`,
      floors && floors > 1 ? `Multi-storey factor applied for ${floors} floors (+6% per additional floor on rate).` : "Single-floor / ground reference; adjust floors for vertical complexity.",
      includeInterior
        ? "Interior fit-out allowance added (~18% of shell estimate) split across typical packages."
        : "Interior fit-out not included; enable the toggle for modular kitchen, ceilings, and loose furniture bands.",
      "GST applied at 18% on the subtotal shown (verify applicability with your CA for your contract structure).",
      "Excludes land cost, approvals, structural redesign, and premium imported finishes unless captured in quality tier.",
    ];

    const result: CostEstimateResult = {
      summary: {
        totalCost: totalBeforeGst,
        costPerSqFt,
        gstAmount,
        grandTotal: totalAmount,
      },
      breakdown,
      interiorBreakdown,
      timeline: estimateTimelineMonths(area, floors ?? 1),
      rateRange: { min: rateMin, max: rateMax, used: rateUsed },
      assumptions,
    };

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    console.error("[AI_COST_ESTIMATE_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
