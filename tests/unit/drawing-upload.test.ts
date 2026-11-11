import { describe, expect, it } from "vitest";
import {
  MAX_DRAWING_UPLOAD_BYTES,
  sanitizeDrawingStorageFileName,
  validateDrawingUploadFile,
} from "@/lib/drawing-upload";
import { isImageDrawing, validateDrawingFile } from "@/components/drawings/drawing-helpers";

function file(name: string, type: string, bytes = 5 * 1024) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateDrawingUploadFile (server)", () => {
  it.each([
    ["plan.png", "image/png", "image/png"],
    ["site.jpg", "image/jpeg", "image/jpeg"],
    ["set.pdf", "application/pdf", "application/pdf"],
  ])("accepts %s", (name, type, expected) => {
    const r = validateDrawingUploadFile(file(name, type));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.contentType).toBe(expected);
  });

  it("rejects missing, empty and oversized files", () => {
    expect(validateDrawingUploadFile(null)).toMatchObject({ ok: false, status: 400 });
    expect(validateDrawingUploadFile(file("a.png", "image/png", 0))).toMatchObject({ ok: false, status: 400 });
    expect(
      validateDrawingUploadFile(file("a.png", "image/png", MAX_DRAWING_UPLOAD_BYTES + 1))
    ).toMatchObject({ ok: false, status: 413 });
  });

  it("stays under the Vercel 4.5 MB request body limit", () => {
    expect(MAX_DRAWING_UPLOAD_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });

  it("rejects disallowed or mismatched types", () => {
    expect(validateDrawingUploadFile(file("evil.exe", "application/octet-stream"))).toMatchObject({
      ok: false,
      status: 415,
    });
    expect(validateDrawingUploadFile(file("plan.png", "application/pdf"))).toMatchObject({
      ok: false,
      status: 415,
    });
  });
});

describe("validateDrawingFile (client mirror)", () => {
  it("agrees with the server on the basics", () => {
    expect(validateDrawingFile(file("plan.png", "image/png"))).toBeNull();
    expect(validateDrawingFile(file("plan.exe", "application/x-msdownload"))).not.toBeNull();
    expect(validateDrawingFile(file("big.pdf", "application/pdf", MAX_DRAWING_UPLOAD_BYTES + 1))).not.toBeNull();
  });
});

describe("sanitizeDrawingStorageFileName", () => {
  it("strips paths and unsafe characters but keeps the extension", () => {
    expect(sanitizeDrawingStorageFileName("../../Ground Floor (v2).PNG")).toBe("Ground_Floor_v2.png");
    expect(sanitizeDrawingStorageFileName("")).toBe("drawing");
  });
});

describe("isImageDrawing", () => {
  it("prefers the stored mime type", () => {
    expect(isImageDrawing("https://x.public.blob.vercel-storage.com/a-AbC123.pdf", "application/pdf")).toBe(false);
    expect(isImageDrawing("https://x.public.blob.vercel-storage.com/a-AbC123", "image/png")).toBe(true);
    expect(isImageDrawing("https://x/plan.dxf", "image/vnd.dxf")).toBe(false);
  });

  it("falls back to the URL extension", () => {
    expect(isImageDrawing("https://x.public.blob.vercel-storage.com/plan-AbC123.png")).toBe(true);
    expect(isImageDrawing("https://x/plan.pdf")).toBe(false);
  });
});
