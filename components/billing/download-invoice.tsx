"use client";

import type { InvoicePdfPayload } from "@/components/invoice-pdf";

/** Renders the tax invoice PDF in the browser and triggers a download. */
export async function downloadInvoicePdf(payload: InvoicePdfPayload): Promise<void> {
  // Loaded on demand: @react-pdf is large and only needed when downloading.
  const [{ pdf }, { InvoicePdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/invoice-pdf"),
  ]);
  const blob = await pdf(<InvoicePdfDocument {...payload} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${payload.invoice.invoiceNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
