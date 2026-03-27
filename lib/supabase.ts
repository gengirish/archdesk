import { createClient } from "@supabase/supabase-js";

// ── Browser client (for client components) ───────────────────
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Server client (for server components & API routes) ───────
// Uses service role key — has full DB access, bypass RLS
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Storage helpers ───────────────────────────────────────────
export const BUCKETS = {
  DRAWINGS: "drawings",
  SITE_PHOTOS: "site-photos",
  RENDERS: "renders",
  FIRM_ASSETS: "firm-assets",
} as const;

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { contentType?: string }
) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: options?.contentType ?? file.type,
    upsert: false,
  });
  if (error) throw error;
  return data;
}

/** Server-only upload using the service role (API routes, cron, etc.). */
export async function uploadBufferAdmin(
  bucket: string,
  path: string,
  body: ArrayBuffer | Blob | File,
  contentType: string
) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return data;
}

export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function deleteFileAdmin(bucket: string, path: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw error;
}
