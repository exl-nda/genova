"use client";

import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function Header() {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--card)] px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            placeholder="Search applications, rules..."
            className="pl-9 bg-[var(--background)]"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Profile">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
