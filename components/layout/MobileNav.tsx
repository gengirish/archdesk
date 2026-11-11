"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarLogo, SidebarNav } from "@/components/layout/Sidebar";

/** Hamburger + left drawer navigation, shown below the md breakpoint. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes (covers back/forward too, not just taps).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="-ml-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Main app sections</SheetDescription>
        <div className="flex h-16 shrink-0 items-center border-b border-border/50 px-4">
          <SidebarLogo onNavigate={() => setOpen(false)} />
        </div>
        <SidebarNav expanded onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
