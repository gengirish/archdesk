import { createClient } from "@supabase/supabase-js";

function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase browser client env vars are missing");
  }
  return createClient(supabaseUrl, anonKey);
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin client env vars are missing");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
  const supabase = getSupabaseBrowserClient();
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
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return data;
}

export function getPublicUrl(bucket: string, path: string) {
  const supabase = getSupabaseBrowserClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function deleteFileAdmin(bucket: string, path: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw error;
}
