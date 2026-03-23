import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that are public (no auth needed)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/portal/(.*)",          // Client portal is token-gated, not Clerk-gated
  "/api/webhooks/(.*)",    // Razorpay webhooks — validated by signature
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
