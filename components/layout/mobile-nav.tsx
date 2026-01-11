"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  Layers,
  Inbox,
  FolderKanban,
  Target,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./mobile-nav.module.css";

const navigation = [
  { name: "Today", href: "/", icon: Calendar },
  { name: "Anytime", href: "/anytime", icon: Layers },
  { name: "Scheduled", href: "/scheduled", icon: CalendarDays },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Habits", href: "/habits", icon: Target },
  { name: "Review", href: "/review", icon: ClipboardCheck },
  { name: "Writing", href: "/writing", icon: FileText },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.navList}>
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                styles.navLink,
                isActive && styles.navLinkActive
              )}
            >
              <item.icon
                className={cn(styles.navIcon, isActive && styles.navIconActive)}
              />
              <span className={styles.navLabel}>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
