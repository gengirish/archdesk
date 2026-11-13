import { LinkIcon } from "lucide-react";

export const metadata = {
  title: "Link not available · ArchDesk",
  robots: { index: false, follow: false },
};

/**
 * Shown for unknown, mistyped or regenerated portal links. Deliberately
 * generic: it never says whether a project or firm exists.
 */
export default function PortalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <LinkIcon className="h-5 w-5 text-slate-500" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">This link isn&apos;t available</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The project link may be mistyped, or your architect may have replaced it with a new one.
          Please ask them to share the latest link.
        </p>
        <p className="mt-8 text-xs text-slate-400">Client portal by ArchDesk</p>
      </div>
    </main>
  );
}
