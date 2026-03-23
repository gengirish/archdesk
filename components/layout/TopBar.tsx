"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-6">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/50 px-3 py-1.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects, clients..."
          className="w-64 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <kbd className="hidden rounded border border-border/50 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
