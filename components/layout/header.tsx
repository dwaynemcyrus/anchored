"use client";

import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { TimerMini } from "@/components/timer";

const pageTitles: Record<string, string> = {
  "/": "Today",
  "/anytime": "Anytime",
  "/scheduled": "Scheduled",
  "/inbox": "Inbox",
  "/projects": "Projects",
  "/habits": "Habits",
  "/review": "Review",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Check for nested routes
  for (const [path, title] of Object.entries(pageTitles)) {
    if (path !== "/" && pathname.startsWith(path)) {
      return title;
    }
  }

  return "Anchored";
}

export function Header() {
  const pathname = usePathname();
  const { open } = useSidebarStore();
  const title = getPageTitle(pathname);
  const today = format(new Date(), "EEEE, MMM d");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={open}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Page title */}
      <h1 className="text-lg font-semibold">{title}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active timer */}
      <TimerMini />

      {/* Date */}
      <time className="text-sm text-muted-foreground">{today}</time>
    </header>
  );
}
