/**
 * Cost estimator domain logic (deterministic, client-safe, unit-tested).
 *
 * - Construction types (Residential, Commercial, Industrial, Institutional)
 *   use the construction split. Residential/Commercial base split and the
 *   city multipliers are unchanged from the original estimator.
 * - Interior and Landscape have their own category templates: an interior
 *   fit-out has no foundation or brickwork, a landscape has no doors/windows.
 * - The optional interior add-on uses a package that suits the project type:
 *   homes get kitchen and wardrobes, offices get workstations and cabins.
 */
import { calculateGST, formatINR } from "@/lib/utils";

export const ESTIMATOR_PROJECT_TYPES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "INTERIOR",
  "LANDSCAPE",
  "INSTITUTIONAL",
] as const;
export type EstimatorProjectType = (typeof ESTIMATOR_PROJECT_TYPES)[number];
export type Quality = "standard" | "premium" | "luxury";

export type EstimateInput = {
  projectType: EstimatorProjectType;
  area: number;
  quality: Quality;
  location: string;
  floors?: number;
  includeInterior?: boolean;
};

type Band = { min: number; max: number; used: number };

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
  /** Shell (base work) rate per sq ft. Kept as `rateRange` for older consumers. */
  rateRange: Band;
  /** Rate per sq ft including the interior add-on; null when not included. */
  interiorRateRange: Band | null;
  /** Whether the interior add-on was applied (it isn't for Interior/Landscape). */
  interiorApplied: boolean;
  assumptions: string[];
};

const RATE_TABLE: Record<EstimatorProjectType, Record<Quality, readonly [number, number]>> = {
  RESIDENTIAL: { standard: [1800, 2200], premium: [2500, 3200], luxury: [3500, 5000] },
  COMMERCIAL: { standard: [2200, 2800], premium: [3000, 4000], luxury: [4500, 6500] },
  INDUSTRIAL: { standard: [1200, 1600], premium: [1800, 2500], luxury: [2800, 4000] },
  INTERIOR: { standard: [800, 1200], premium: [1500, 2200], luxury: [2500, 4000] },
  LANDSCAPE: { standard: [400, 700], premium: [800, 1400], luxury: [1500, 2500] },
  INSTITUTIONAL: { standard: [2000, 2600], premium: [2800, 3800], luxury: [4000, 5500] },
};

type Split = readonly { category: string; percentage: number }[];

/** Building construction split (unchanged from the original estimator). */
export const CONSTRUCTION_TEMPLATE: Split = [
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
];

export const INTERIOR_TEMPLATE: Split = [
  { category: "Civil Work & False Ceiling", percentage: 14 },
  { category: "Flooring & Tiling", percentage: 12 },
  { category: "Carpentry & Modular Furniture", percentage: 30 },
  { category: "Electrical & Lighting", percentage: 10 },
  { category: "Plumbing & Sanitary", percentage: 7 },
  { category: "Painting & Finishes", percentage: 8 },
  { category: "Soft Furnishings & Décor", percentage: 7 },
  { category: "Design & Project Management", percentage: 10 },
  { category: "Contingency", percentage: 2 },
];

export const LANDSCAPE_TEMPLATE: Split = [
  { category: "Earthwork & Grading", percentage: 10 },
  { category: "Hardscape (Paving, Steps, Walls)", percentage: 28 },
  { category: "Softscape & Planting", percentage: 20 },
  { category: "Irrigation", percentage: 10 },
  { category: "Outdoor Lighting", percentage: 8 },
  { category: "Water Features", percentage: 10 },
  { category: "Landscape Design Fee", percentage: 10 },
  { category: "Contingency", percentage: 4 },
];

export function categoryTemplate(type: EstimatorProjectType): Split {
  if (type === "INTERIOR") return INTERIOR_TEMPLATE;
  if (type === "LANDSCAPE") return LANDSCAPE_TEMPLATE;
  return CONSTRUCTION_TEMPLATE;
}

/** Interior add-on packages (weights sum to 1) by project type. */
export const INTERIOR_PACKAGES: Record<
  "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "INSTITUTIONAL",
  readonly { category: string; w: number }[]
> = {
  RESIDENTIAL: [
    { category: "False Ceiling", w: 0.15 },
    { category: "Modular Kitchen", w: 0.35 },
    { category: "Wardrobes & Storage", w: 0.25 },
    { category: "Furniture", w: 0.15 },
    { category: "Lighting & Fixtures", w: 0.1 },
  ],
  COMMERCIAL: [
    { category: "Workstations & Loose Furniture", w: 0.3 },
    { category: "Cabins & Glass Partitions", w: 0.2 },
    { category: "False Ceiling", w: 0.15 },
    { category: "Reception & Lobby", w: 0.1 },
    { category: "Pantry", w: 0.08 },
    { category: "Lighting & Fixtures", w: 0.12 },
    { category: "Signage & Branding", w: 0.05 },
  ],
  INDUSTRIAL: [
    { category: "Admin Block Fit-out", w: 0.35 },
    { category: "Partitions", w: 0.15 },
    { category: "False Ceiling", w: 0.15 },
    { category: "Lighting & Fixtures", w: 0.2 },
    { category: "Storage & Racking", w: 0.15 },
  ],
  INSTITUTIONAL: [
    { category: "Classroom & Office Furniture", w: 0.35 },
    { category: "Partitions", w: 0.15 },
    { category: "False Ceiling", w: 0.15 },
    { category: "Lighting & Fixtures", w: 0.15 },
    { category: "Storage", w: 0.1 },
    { category: "Signage & Wayfinding", w: 0.1 },
  ],
};

/** Interior add-on as a share of the shell estimate. */
export const INTERIOR_ADDON_SHARE = 0.18;

/** The add-on only makes sense for building types. */
export function supportsInteriorAddon(type: EstimatorProjectType): boolean {
  return type !== "INTERIOR" && type !== "LANDSCAPE";
}

export function getLocationMultiplier(location: string): { mult: number; label: string } {
  const s = location.trim().toLowerCase();
  if (!s) return { mult: 1, label: "Tier-2 & other cities (default)" };
  if (s.includes("rural") || s.includes("village")) return { mult: 0.85, label: "Rural" };
  const mumbaiDelhi = ["mumbai", "delhi", "new delhi", "ncr", "gurgaon", "gurugram", "noida", "faridabad", "ghaziabad"];
  if (mumbaiDelhi.some((k) => s.includes(k))) return { mult: 1.3, label: "Mumbai / Delhi NCR" };
  const tier1b = ["bangalore", "bengaluru", "hyderabad", "pune", "chennai"];
  if (tier1b.some((k) => s.includes(k))) return { mult: 1.15, label: "Bangalore, Hyderabad, Pune, Chennai" };
  return { mult: 1, label: "Tier-2 & other cities" };
}

function floorFactor(floors?: number): number {
  const f = floors && floors >= 1 ? floors : 1;
  return f <= 1 ? 1 : 1 + 0.06 * (f - 1);
}

function estimateTimelineMonths(type: EstimatorProjectType, area: number, floors: number): string {
  if (type === "INTERIOR") {
    const [lo, hi] = area < 1500 ? [2, 3] : area < 4000 ? [3, 5] : area < 10000 ? [4, 7] : [6, 10];
    return `${lo}-${hi} months estimated`;
  }
  if (type === "LANDSCAPE") {
    const [lo, hi] = area < 5000 ? [1, 3] : area < 20000 ? [3, 5] : [4, 8];
    return `${lo}-${hi} months estimated`;
  }
  const f = floors >= 1 ? floors : 1;
  const [lo, hi] = area < 1500 ? [5, 9] : area < 4000 ? [9, 15] : area < 10000 ? [14, 22] : [20, 36];
  const extra = Math.max(0, f - 1) * 2;
  return `${lo + extra}-${hi + extra} months estimated`;
}

/** Splits `total` by percentages; the last row absorbs rounding drift. */
function allocate(total: number, split: Split) {
  let allocated = 0;
  return split.map((row, i) => {
    const isLast = i === split.length - 1;
    const amount = isLast ? Math.round(total - allocated) : Math.round((total * row.percentage) / 100);
    if (!isLast) allocated += amount;
    return { category: row.category, percentage: row.percentage, amount };
  });
}

function allocateWeights(total: number, weights: readonly { category: string; w: number }[]) {
  const rows = weights.map(({ category, w }) => ({ category, amount: Math.round(total * w) }));
  const drift = Math.round(total) - rows.reduce((s, x) => s + x.amount, 0);
  if (rows.length && drift !== 0) rows[rows.length - 1].amount += drift;
  return rows;
}

const TYPE_LABEL: Record<EstimatorProjectType, string> = {
  RESIDENTIAL: "residential",
  COMMERCIAL: "commercial",
  INDUSTRIAL: "industrial",
  INTERIOR: "interior fit-out",
  LANDSCAPE: "landscape",
  INSTITUTIONAL: "institutional",
};

export function computeEstimate(input: EstimateInput): CostEstimateResult {
  const { projectType, area, quality, location, floors } = input;
  const { mult: locMult, label: locLabel } = getLocationMultiplier(location);
  // Floors don't change interior or landscape rates.
  const ff = supportsInteriorAddon(projectType) ? floorFactor(floors) : 1;
  const [baseMin, baseMax] = RATE_TABLE[projectType][quality];

  const shell: Band = {
    min: Math.round(baseMin * locMult * ff),
    max: Math.round(baseMax * locMult * ff),
    used: Math.round(((baseMin + baseMax) / 2) * locMult * ff),
  };

  const baseTotal = Math.round(area * shell.used);
  const breakdown = allocate(baseTotal, categoryTemplate(projectType));

  const interiorApplied = !!input.includeInterior && supportsInteriorAddon(projectType);
  const interiorTotal = interiorApplied ? Math.round(baseTotal * INTERIOR_ADDON_SHARE) : 0;
  const interiorBreakdown =
    interiorApplied && interiorTotal > 0
      ? allocateWeights(interiorTotal, INTERIOR_PACKAGES[projectType as keyof typeof INTERIOR_PACKAGES])
      : undefined;

  const totalBeforeGst = baseTotal + interiorTotal;
  const { gstAmount, totalAmount } = calculateGST(totalBeforeGst, 18);
  const costPerSqFt = Math.round(totalBeforeGst / area);

  // Same factor as the add-on, so the band always brackets the effective rate.
  const withInterior: Band | null = interiorApplied
    ? {
        min: Math.round(shell.min * (1 + INTERIOR_ADDON_SHARE)),
        max: Math.round(shell.max * (1 + INTERIOR_ADDON_SHARE)),
        used: costPerSqFt,
      }
    : null;

  const areaLabel = new Intl.NumberFormat("en-IN").format(Math.round(area));
  const unit = projectType === "LANDSCAPE" ? "sq ft of site" : "sq ft";
  const assumptions = [
    `Indicative rates for ${TYPE_LABEL[projectType]} (${quality}) in ${location.trim()}.`,
    `Ex-GST window at band edges: ${formatINR(Math.round(area * shell.min))} – ${formatINR(Math.round(area * shell.max))} for ${areaLabel} ${unit}${interiorApplied ? " (before interior add-on)" : ""}.`,
    `Location band: ${locLabel} — ${locMult}× multiplier on base Indian market rates.`,
    !supportsInteriorAddon(projectType)
      ? "Floors don't change the rate for this project type."
      : floors && floors > 1
        ? `Multi-storey factor applied for ${floors} floors (+6% per additional floor on rate).`
        : "Single-floor / ground reference; adjust floors for vertical complexity.",
    projectType === "INTERIOR"
      ? "Interior fit-out of an existing shell: no structure, masonry or external works included."
      : projectType === "LANDSCAPE"
        ? "Landscape works only: building construction and interiors are excluded."
        : interiorApplied
          ? `Interior fit-out allowance added (~18% of shell estimate) using a ${TYPE_LABEL[projectType]} package.`
          : "Interior fit-out not included; enable the toggle to add a type-appropriate interior package.",
    "GST applied at 18% on the subtotal shown (verify applicability with your CA for your contract structure).",
    "Excludes land cost, approvals, structural redesign, and premium imported finishes unless captured in quality tier.",
  ];

  return {
    summary: { totalCost: totalBeforeGst, costPerSqFt, gstAmount, grandTotal: totalAmount },
    breakdown,
    interiorBreakdown,
    timeline: estimateTimelineMonths(projectType, area, floors ?? 1),
    rateRange: shell,
    interiorRateRange: withInterior,
    interiorApplied,
    assumptions,
  };
}

/** Stable key of the inputs, used to detect a stale snapshot in the UI. */
export function estimateInputKey(input: EstimateInput): string {
  return JSON.stringify([
    input.projectType,
    Math.round(input.area * 100) / 100,
    input.quality,
    input.location.trim().toLowerCase(),
    supportsInteriorAddon(input.projectType) ? input.floors ?? 1 : 1,
    supportsInteriorAddon(input.projectType) ? !!input.includeInterior : false,
  ]);
}
