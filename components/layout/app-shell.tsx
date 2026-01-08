"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { FloatingMenuButton } from "./floating-menu-button";
import { PullSearch } from "./pull-search";
import { PushOverlayStack } from "./push-overlay-stack";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { useSearchUiStore } from "@/lib/stores/search-ui-store";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const { setSearchOpen } = useSearchUiStore();
  const [isPulling, setIsPulling] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [isArmed, setIsArmed] = useState(false);
  const pullStartRef = useRef(0);
  const activeScrollRef = useRef<HTMLElement | null>(null);
  const pointerActiveRef = useRef(false);
  const touchActiveRef = useRef(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    setIsPulling(false);
    setPullOffset(0);
    setIsArmed(false);
  }, [isSearchOpen]);

  useEffect(() => {
    setSearchOpen(isSearchOpen);
  }, [isSearchOpen, setSearchOpen]);

  useEffect(() => {
    const PULL_THRESHOLD = 72;
    const MAX_PULL = 140;
    const MOVE_SLOP = 6;

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
    };

    const findScrollableParent = (target: HTMLElement | null) => {
      let node: HTMLElement | null = target;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return document.scrollingElement as HTMLElement | null;
    };

    const resetPull = () => {
      setIsPulling(false);
      setPullOffset(0);
      setIsArmed(false);
      activeScrollRef.current = null;
      pointerActiveRef.current = false;
      touchActiveRef.current = false;
    };

    const startPull = (clientY: number, target: EventTarget | null) => {
      if (isSearchOpen) return;
      if (isEditableTarget(target)) return;
      const scrollable = findScrollableParent(target as HTMLElement | null);
      if (!scrollable || scrollable.scrollTop > 0) return;
      activeScrollRef.current = scrollable;
      pullStartRef.current = clientY;
      pointerActiveRef.current = true;
    };

    const movePull = (clientY: number, event?: Event) => {
      if (!pointerActiveRef.current) return;
      if (!activeScrollRef.current) return;
      const dy = clientY - pullStartRef.current;
      if (dy <= 0) {
        if (isPulling) {
          resetPull();
        }
        return;
      }
      if (dy < MOVE_SLOP) return;
      event?.preventDefault();
      const nextOffset = Math.min(MAX_PULL, dy);
      setIsPulling(true);
      setPullOffset(nextOffset);
      setIsArmed(nextOffset >= PULL_THRESHOLD);
    };

    const endPull = (clientY: number) => {
      if (!pointerActiveRef.current) return;
      if (isArmed) {
        setIsSearchOpen(true);
      }
      resetPull();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      startPull(event.clientY, event.target);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      movePull(event.clientY, event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      endPull(event.clientY);
    };

    const handlePointerCancel = () => {
      resetPull();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      touchActiveRef.current = true;
      startPull(event.touches[0].clientY, event.target);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!touchActiveRef.current) return;
      if (event.touches.length !== 1) return;
      movePull(event.touches[0].clientY, event);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchActiveRef.current) return;
      const touch = event.changedTouches[0];
      if (touch) {
        endPull(touch.clientY);
      } else {
        resetPull();
      }
    };

    const handleTouchCancel = () => {
      resetPull();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [isArmed, isPulling, isSearchOpen]);

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
        <PullSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          isPulling={isPulling}
          pullProgress={Math.min(1, pullOffset / 72)}
          isArmed={isArmed}
          searchScopeRef={mainRef}
        />

        {/* Page content */}
        <main className={layoutStyles.main}>
          <div className={layoutStyles.container} ref={mainRef}>
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

    </div>
  );
}
