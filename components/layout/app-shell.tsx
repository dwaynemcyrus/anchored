"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { FloatingMenuButton } from "./floating-menu-button";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { ErrorBoundary } from "@/components/error-boundary";
import styles from "./mobile-drawer.module.css";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
}

export function AppShell({ children, userEmail }: AppShellProps) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebarStore();

  return (
    <div className="relative min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r lg:block">
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
      <div className="lg:pl-64">
        <FloatingMenuButton />

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)] pb-6 lg:pb-0">
          <div className="container py-6">
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

    </div>
  );
}
