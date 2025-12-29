"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { ErrorBoundary } from "@/components/error-boundary";

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

      {/* Mobile/Tablet sidebar sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar userEmail={userEmail} onNavigate={close} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="lg:pl-64">
        <Header />

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)] pb-20 lg:pb-0">
          <div className="container py-6">
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
