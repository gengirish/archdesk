/**
 * Browser-side photo downsizing so several phone photos fit in one upload
 * (Vercel caps request bodies at 4.5 MB). Resizes to at most `maxSide` px on
 * the long edge and re-encodes as JPEG. Falls back to the original file when
 * the browser can't decode it or the original is already smaller.
 */
export async function compressImage(
  file: File,
  { maxSide = 1600, quality = 0.8 }: { maxSide?: number; quality?: number } = {}
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // flatten transparency for JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;
    const isAllowedOriginal = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (isAllowedOriginal && blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
