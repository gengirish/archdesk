import type { z } from "zod";

/** Field name → first error message, for inline form errors. */
export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/** Error from an API envelope `{ error, fieldErrors }`, carrying the per-field messages. */
export class ApiValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Partial<Record<string, string>> = {}
  ) {
    super(message);
    this.name = "ApiValidationError";
  }
}

/** Parse `{ data, error, fieldErrors }`; throws ApiValidationError on failure. */
export async function readApiEnvelope<T>(res: Response): Promise<T> {
  let json: { data?: T | null; error?: string | null; fieldErrors?: Partial<Record<string, string>> };
  try {
    json = await res.json();
  } catch {
    throw new ApiValidationError(`Request failed (${res.status})`);
  }
  if (!res.ok || json.error) {
    throw new ApiValidationError(json.error ?? `Request failed (${res.status})`, json.fieldErrors ?? {});
  }
  if (json.data === null || json.data === undefined) throw new ApiValidationError("No data");
  return json.data;
}
