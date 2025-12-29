"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  Layers,
  Inbox,
  FolderKanban,
  Target,
  ClipboardCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Today", href: "/", icon: Calendar },
  { name: "Anytime", href: "/anytime", icon: Layers },
  { name: "Scheduled", href: "/scheduled", icon: CalendarDays },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Habits", href: "/habits", icon: Target },
  { name: "Review", href: "/review", icon: ClipboardCheck },
];

interface SidebarProps {
  userEmail?: string | null;
  onNavigate?: () => void;
}

export function Sidebar({ userEmail, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold"
          onClick={handleNavClick}
        >
          <span className="text-lg">Anchored</span>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Settings */}
      <div className="px-2 py-2">
        <Link
          href="/settings"
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>

      <Separator />

      {/* User section */}
      <div className="p-4">
        {userEmail && (
          <p className="mb-2 truncate text-xs text-muted-foreground">
            {userEmail}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
