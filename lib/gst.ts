/**
 * GST split for a tax invoice.
 * Intra-state supply (supplier and recipient in the same state) → CGST + SGST,
 * each half the rate. Inter-state → IGST at the full rate.
 * Client-safe.
 */

/** GSTIN state codes → state/UT names (first two digits of a GSTIN). */
const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra",
  "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh",
};

const ALIASES: Record<string, string> = {
  ka: "karnataka", mh: "maharashtra", tn: "tamil nadu", dl: "delhi", "new delhi": "delhi",
  orissa: "odisha", pondicherry: "puducherry", ap: "andhra pradesh", ts: "telangana",
  tg: "telangana", gj: "gujarat", kl: "kerala", up: "uttar pradesh", wb: "west bengal",
};

export function normaliseState(state?: string | null): string | null {
  if (!state) return null;
  const key = state.trim().toLowerCase().replace(/\s+/g, " ").replace(/&/g, "and");
  if (!key) return null;
  return ALIASES[key] ?? key;
}

/** State from a GSTIN's first two digits, if it is a known code. */
export function stateFromGstin(gstin?: string | null): string | null {
  const code = gstin?.trim().slice(0, 2);
  return code && GST_STATE_CODES[code] ? GST_STATE_CODES[code] : null;
}

export type GstSplit = {
  baseAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  interState: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  /** State used as place of supply on the invoice. */
  placeOfSupply: string | null;
};

/**
 * @param supplierState firm's state (falls back to the state in its GSTIN)
 * @param recipientState client's state; when unknown we treat the supply as
 *        intra-state (same as the firm), the common case for local practices.
 */
export function splitGst(params: {
  baseAmount: number;
  gstPercent: number;
  supplierState?: string | null;
  supplierGstin?: string | null;
  recipientState?: string | null;
}): GstSplit {
  const base = Math.round(params.baseAmount);
  const gstAmount = Math.round((base * params.gstPercent) / 100);
  const supplier = normaliseState(params.supplierState) ?? normaliseState(stateFromGstin(params.supplierGstin));
  const recipient = normaliseState(params.recipientState);
  const interState = !!supplier && !!recipient && supplier !== recipient;

  const cgst = interState ? 0 : Math.round(gstAmount / 2);
  const sgst = interState ? 0 : gstAmount - cgst;
  const igst = interState ? gstAmount : 0;

  return {
    baseAmount: base,
    gstPercent: params.gstPercent,
    gstAmount,
    totalAmount: base + gstAmount,
    interState,
    cgst,
    sgst,
    igst,
    placeOfSupply:
      params.recipientState?.trim() || params.supplierState?.trim() || stateFromGstin(params.supplierGstin),
  };
}
