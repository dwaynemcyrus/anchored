"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRitualModeStore } from "@/lib/stores/ritual-mode-store";
import { QuickCaptureSheet } from "./quick-capture-sheet";
import styles from "./mode-button.module.css";

const SWIPE_THRESHOLD = 24;
const MOVE_SLOP = 6;
const LONG_PRESS_MS = 500;
const ANIMATION_MS = 350;

const MODE_ROUTES = [
  "/",
  "/tasks",
  "/anytime",
  "/scheduled",
  "/inbox",
  "/projects",
  "/habits",
  "/writing",
  "/review",
  "/logbook",
  "/end-day",
];

type Point = { x: number; y: number };

export function ModeButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { isRitualMode } = useRitualModeStore();
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRitualNoticeOpen, setIsRitualNoticeOpen] = useState(false);
  const startPointRef = useRef<Point | null>(null);
  const swipedRef = useRef(false);
  const movedRef = useRef(false);
  const longPressRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const animationTimeoutRef = useRef<number | null>(null);
  const ritualNoticeTimeoutRef = useRef<number | null>(null);

  const shouldShow = MODE_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const queueAnimation = useCallback(() => {
    setIsAnimating(true);
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_MS);
  }, []);

  const showRitualNotice = useCallback(() => {
    setIsRitualNoticeOpen(true);
    if (ritualNoticeTimeoutRef.current) {
      window.clearTimeout(ritualNoticeTimeoutRef.current);
    }
    ritualNoticeTimeoutRef.current = window.setTimeout(() => {
      setIsRitualNoticeOpen(false);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }
      if (ritualNoticeTimeoutRef.current) {
        window.clearTimeout(ritualNoticeTimeoutRef.current);
      }
    };
  }, []);

  const openModeSheet = useCallback(() => {
    if (isAnimating || isCaptureOpen) return;
    setIsCaptureOpen(false);
    setIsModeOpen(true);
    queueAnimation();
  }, [isAnimating, isCaptureOpen, queueAnimation]);

  const openCaptureSheet = useCallback(() => {
    if (isAnimating || isModeOpen) return;
    setIsModeOpen(false);
    setIsCaptureOpen(true);
    queueAnimation();
  }, [isAnimating, isModeOpen, queueAnimation]);

  const closeModeSheet = useCallback(() => {
    if (!isModeOpen) return;
    setIsModeOpen(false);
    queueAnimation();
  }, [isModeOpen, queueAnimation]);

  const closeCaptureSheet = useCallback(() => {
    if (!isCaptureOpen) return;
    setIsCaptureOpen(false);
    queueAnimation();
  }, [isCaptureOpen, queueAnimation]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (isAnimating) return;
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startPointRef.current = { x: event.clientX, y: event.clientY };
    swipedRef.current = false;
    movedRef.current = false;
    longPressTriggeredRef.current = false;

    clearLongPressTimer();

    if (isRitualMode) {
      longPressRef.current = window.setTimeout(() => {
        if (swipedRef.current || movedRef.current) return;
        longPressTriggeredRef.current = true;
        showRitualNotice();
      }, LONG_PRESS_MS);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!startPointRef.current || swipedRef.current) return;
    const dx = event.clientX - startPointRef.current.x;
    const dy = event.clientY - startPointRef.current.y;

    if (Math.abs(dx) > MOVE_SLOP || Math.abs(dy) > MOVE_SLOP) {
      movedRef.current = true;
      clearLongPressTimer();
    }

    if (dy <= -SWIPE_THRESHOLD) {
      swipedRef.current = true;
      clearLongPressTimer();
      openCaptureSheet();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!startPointRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    clearLongPressTimer();

    const shouldTap =
      !swipedRef.current && !movedRef.current && !longPressTriggeredRef.current;

    startPointRef.current = null;

    if (!shouldTap) return;
    if (isRitualMode) {
      showRitualNotice();
      return;
    }
    openModeSheet();
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (startPointRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    startPointRef.current = null;
    clearLongPressTimer();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isAnimating) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (isRitualMode) {
      showRitualNotice();
      return;
    }
    openModeSheet();
  };

  const handleModeSelect = (href: string) => {
    closeModeSheet();
    router.replace(href);
  };

  const shouldRender = shouldShow || isModeOpen || isCaptureOpen;
  const showButton = shouldShow && !isCaptureOpen && !isModeOpen;

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {showButton && (
        <div className={styles.buttonWrapper}>
          <Tooltip open={isRitualNoticeOpen}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={styles.modeButton}
                aria-label="Mode. Tap to switch modes. Swipe up to capture."
                aria-disabled={isAnimating}
                onContextMenu={(event) => event.preventDefault()}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onKeyDown={handleKeyDown}
              >
                MODE
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={10}
              className={styles.ritualNotice}
            >
              disabled in ritual mode. Quick Capture available.
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {isModeOpen && (
        <div className={styles.sheetRoot} role="presentation">
          <div className={styles.sheetOverlay} onClick={closeModeSheet} />
          <div
            className={styles.sheetPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Switch mode"
          >
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>Modes</span>
              <button
                type="button"
                className={styles.sheetClose}
                onClick={closeModeSheet}
              >
                Close
              </button>
            </div>
            <div className={styles.sheetList}>
              <button
                type="button"
                className={styles.sheetItem}
                onClick={() => handleModeSelect("/tasks")}
              >
                Command
              </button>
              <button
                type="button"
                className={styles.sheetItem}
                onClick={() => handleModeSelect("/writing")}
              >
                Knowledge
              </button>
              <button
                type="button"
                className={styles.sheetItem}
                onClick={() => handleModeSelect("/review")}
              >
                Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      <QuickCaptureSheet isOpen={isCaptureOpen} onClose={closeCaptureSheet} />
    </>
  );
}
