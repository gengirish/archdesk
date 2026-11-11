import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/portal/(.*)",
  "/api/portal/(.*)",
  "/api/webhooks/(.*)",
]);

const isPortalRoute = createRouteMatcher(["/portal/(.*)", "/api/portal/(.*)"]);

/** Per-IP across all tokens, so guessing tokens doesn't get a fresh allowance per guess. */
const PORTAL_LIMIT = { requests: 60, windowMs: 60_000 };

export default clerkMiddleware((auth, request) => {
  const req = request as NextRequest;

  if (isPortalRoute(req)) {
    const result = rateLimit(`portal:${clientIp(req.headers)}`, PORTAL_LIMIT.requests, PORTAL_LIMIT.windowMs);
    if (!result.ok) {
      const headers = { "Retry-After": String(result.retryAfterSeconds) };
      return req.nextUrl.pathname.startsWith("/api/")
        ? NextResponse.json(
            { data: null, error: "Too many requests. Please wait a minute and try again." },
            { status: 429, headers }
          )
        : new NextResponse("Too many requests. Please wait a minute and try again.", {
            status: 429,
            headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
          });
    }
  }

  if (!isPublicRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
