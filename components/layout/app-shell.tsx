"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { FloatingMenuButton } from "./floating-menu-button";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { ErrorBoundary } from "@/components/error-boundary";
import styles from "./mobile-drawer.module.css";
import layoutStyles from "./app-shell.module.css";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
}

export function AppShell({ children, userEmail }: AppShellProps) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebarStore();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const setAppHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-height", `${Math.round(height)}px`);
    };
    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("resize", setAppHeight);
    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("resize", setAppHeight);
    };
  }, []);

  return (
    <div className={layoutStyles.shell}>
      {/* Desktop sidebar */}
      <aside className={layoutStyles.desktopSidebar}>
        <Sidebar userEmail={userEmail} />
      </aside>

      {/* Mobile/Tablet sidebar drawer */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        <Sidebar userEmail={userEmail} onNavigate={close} />
      </div>

      {/* Main content area */}
      <div className={layoutStyles.content}>
        <FloatingMenuButton />

        {/* Page content */}
        <main className={layoutStyles.main}>
          <div className={layoutStyles.container}>
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

    </div>
  );
}
