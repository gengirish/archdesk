"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The dashboard scrolls inside <main>, not the window, so Next.js's
 * scroll-to-top on navigation doesn't reach it. Reset it whenever the route
 * changes, e.g. arriving at /billing?projectId=…&decision=open from Analytics.
 * A #hash in the URL is left to the browser.
 */
export function ScrollContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hash) return;
    ref.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return (
    <main ref={ref} className={cn(className)}>
      {children}
    </main>
  );
}
