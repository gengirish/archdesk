/**
 * Rupee amount in words using the Indian system (thousand, lakh, crore),
 * e.g. 123900 → "One Lakh Twenty-Three Thousand Nine Hundred Rupees Only".
 * Paise are included when present: 59000.5 → "… Rupees and Fifty Paise Only".
 */
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? `${t}-${ONES[o]}` : t;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

/** Whole number in Indian words; crores recurse so any size works. */
function integerInWords(n: number): string {
  if (n === 0) return "Zero";
  const crores = Math.floor(n / 1_00_00_000);
  const lakhs = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousands = Math.floor((n % 1_00_000) / 1000);
  const rest = n % 1000;
  return [
    crores ? `${integerInWords(crores)} Crore` : "",
    lakhs ? `${twoDigits(lakhs)} Lakh` : "",
    thousands ? `${twoDigits(thousands)} Thousand` : "",
    rest ? threeDigits(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function amountInWordsINR(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const totalPaise = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const sign = amount < 0 ? "Minus " : "";
  const rupeeWords = `${sign}${integerInWords(rupees)} ${rupees === 1 ? "Rupee" : "Rupees"}`;
  return paise ? `${rupeeWords} and ${twoDigits(paise)} Paise Only` : `${rupeeWords} Only`;
}
