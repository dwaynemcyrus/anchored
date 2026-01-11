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
  Archive,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import styles from "./sidebar.module.css";

const navigation = [
  { name: "Today", href: "/", icon: Calendar },
  { name: "Anytime", href: "/anytime", icon: Layers },
  { name: "Scheduled", href: "/scheduled", icon: CalendarDays },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Habits", href: "/habits", icon: Target },
  { name: "Review", href: "/review", icon: ClipboardCheck },
  { name: "Logbook", href: "/logbook", icon: Archive },
  { name: "Writing", href: "/writing", icon: FileText },
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
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <Link
          href="/"
          className={styles.logoLink}
          onClick={handleNavClick}
        >
          <span className={styles.logoText}>Anchored</span>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className={styles.nav}>
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
                styles.navLink,
                isActive && styles.navLinkActive
              )}
            >
              <item.icon className={styles.navIcon} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Settings */}
      <div className={styles.settings}>
        <Link
          href="/settings"
          onClick={handleNavClick}
          className={cn(
            styles.navLink,
            pathname === "/settings" && styles.navLinkActive
          )}
        >
          <Settings className={styles.navIcon} />
          Settings
        </Link>
      </div>

      <Separator />

      {/* User section */}
      <div className={styles.userSection}>
        {userEmail && (
          <p className={styles.userEmail}>
            {userEmail}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          <LogOut className={styles.navIcon} />
          Log out
        </Button>
      </div>
    </div>
  );
}
