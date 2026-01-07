"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRitualModeStore } from "@/lib/stores/ritual-mode-store";
import { QuickCaptureSheet } from "./quick-capture-sheet";
import styles from "./mode-button.module.css";

const SWIPE_THRESHOLD = 24;
const MOVE_SLOP = 6;
const HOLD_MOVE_SLOP = 10;
const HOLD_DURATION_MS = 3000;
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
type HoldZone = "left" | "right" | "up" | null;
type ZoneNotice = "mode" | "search" | "capture" | null;
type ZonePositions = {
  left: { x: number; y: number };
  right: { x: number; y: number };
  up: { x: number; y: number };
};

export function ModeButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { isRitualMode } = useRitualModeStore();
  const isSearchEnabled = false;
  const isSwipeEnabled = false;
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHoldMode, setIsHoldMode] = useState(false);
  const [activeZone, setActiveZone] = useState<HoldZone>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isRitualNoticeOpen, setIsRitualNoticeOpen] = useState(false);
  const [isSearchNoticeOpen, setIsSearchNoticeOpen] = useState(false);
  const [zoneNotice, setZoneNotice] = useState<ZoneNotice>(null);
  const [zonePositions, setZonePositions] = useState<ZonePositions | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const touchActiveRef = useRef(false);
  const swipedRef = useRef(false);
  const movedRef = useRef(false);
  const longPressRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const animationTimeoutRef = useRef<number | null>(null);
  const ritualNoticeTimeoutRef = useRef<number | null>(null);
  const searchNoticeTimeoutRef = useRef<number | null>(null);
  const zoneNoticeTimeoutRef = useRef<number | null>(null);
  const bodyOverflowRef = useRef<string | null>(null);
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const rightZoneRef = useRef<HTMLDivElement | null>(null);
  const upZoneRef = useRef<HTMLDivElement | null>(null);
  const buttonWrapperRef = useRef<HTMLDivElement | null>(null);

  const shouldShow = MODE_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
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

  const showSearchNotice = useCallback(() => {
    setIsSearchNoticeOpen(true);
    if (searchNoticeTimeoutRef.current) {
      window.clearTimeout(searchNoticeTimeoutRef.current);
    }
    searchNoticeTimeoutRef.current = window.setTimeout(() => {
      setIsSearchNoticeOpen(false);
    }, 6000);
  }, []);

  const showZoneNotice = useCallback((next: ZoneNotice) => {
    setZoneNotice(next);
    if (zoneNoticeTimeoutRef.current) {
      window.clearTimeout(zoneNoticeTimeoutRef.current);
    }
    zoneNoticeTimeoutRef.current = window.setTimeout(() => {
      setZoneNotice(null);
    }, 2000);
  }, []);

  const resetHoldState = useCallback(() => {
    setIsHoldMode(false);
    setActiveZone(null);
    setDragOffset({ x: 0, y: 0 });
    if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
  }, []);

  const computeZonePositions = useCallback(() => {
    const button = buttonWrapperRef.current?.getBoundingClientRect();
    if (!button) return;
    const zoneSize = 96;
    const offset = 60;
    const leftX = button.left - offset - zoneSize;
    const rightX = button.right + offset;
    const upX = button.left + button.width / 2 - zoneSize / 2;
    const upY = button.top - offset - zoneSize;
    const baseY = button.top + button.height / 2 - zoneSize / 2;
    setZonePositions({
      left: { x: leftX, y: baseY },
      right: { x: rightX, y: baseY },
      up: { x: upX, y: upY },
    });
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }
      if (ritualNoticeTimeoutRef.current) {
        window.clearTimeout(ritualNoticeTimeoutRef.current);
      }
      if (searchNoticeTimeoutRef.current) {
        window.clearTimeout(searchNoticeTimeoutRef.current);
      }
      if (zoneNoticeTimeoutRef.current) {
        window.clearTimeout(zoneNoticeTimeoutRef.current);
      }
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
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

  const hitTestZone = useCallback((point: Point): HoldZone => {
    const left = leftZoneRef.current?.getBoundingClientRect();
    if (
      left &&
      point.x >= left.left &&
      point.x <= left.right &&
      point.y >= left.top &&
      point.y <= left.bottom
    ) {
      return "left";
    }
    const right = rightZoneRef.current?.getBoundingClientRect();
    if (
      right &&
      point.x >= right.left &&
      point.x <= right.right &&
      point.y >= right.top &&
      point.y <= right.bottom
    ) {
      return "right";
    }
    const up = upZoneRef.current?.getBoundingClientRect();
    if (
      up &&
      point.x >= up.left &&
      point.x <= up.right &&
      point.y >= up.top &&
      point.y <= up.bottom
    ) {
      return "up";
    }
    return null;
  }, []);

  const enterHoldMode = useCallback(() => {
    if (isRitualMode) return;
    setIsHoldMode(true);
    setActiveZone(null);
    setDragOffset({ x: 0, y: 0 });
    if (bodyOverflowRef.current === null) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
  }, [isRitualMode]);

  const beginPress = useCallback(
    (point: Point) => {
      startPointRef.current = point;
      swipedRef.current = false;
      movedRef.current = false;
      longPressTriggeredRef.current = false;
      clearLongPressTimer();
      clearHoldTimer();

      if (isRitualMode) {
        longPressRef.current = window.setTimeout(() => {
          if (swipedRef.current || movedRef.current) return;
          longPressTriggeredRef.current = true;
          showRitualNotice();
        }, LONG_PRESS_MS);
        return;
      }

      holdTimerRef.current = window.setTimeout(() => {
        enterHoldMode();
      }, HOLD_DURATION_MS);
    },
    [clearHoldTimer, clearLongPressTimer, enterHoldMode, isRitualMode, showRitualNotice]
  );

  const movePress = useCallback(
    (point: Point, event?: Event) => {
      if (!startPointRef.current) return;
      const dx = point.x - startPointRef.current.x;
      const dy = point.y - startPointRef.current.y;

      if (isHoldMode) {
        event?.preventDefault();
        setDragOffset({ x: dx, y: dy });
        setActiveZone(hitTestZone(point));
        return;
      }

      if (Math.abs(dx) > HOLD_MOVE_SLOP || Math.abs(dy) > HOLD_MOVE_SLOP) {
        movedRef.current = true;
        clearHoldTimer();
      }

      if (!isSwipeEnabled) {
        return;
      }

      if (Math.abs(dx) > MOVE_SLOP || Math.abs(dy) > MOVE_SLOP) {
        movedRef.current = true;
        clearLongPressTimer();
      }

      if (dy <= -SWIPE_THRESHOLD) {
        swipedRef.current = true;
        clearHoldTimer();
        clearLongPressTimer();
        openCaptureSheet();
        return;
      }

      if (dy >= SWIPE_THRESHOLD) {
        swipedRef.current = true;
        clearHoldTimer();
        clearLongPressTimer();
        if (isRitualMode) {
          return;
        }
        if (!isSearchEnabled) {
          showSearchNotice();
        }
      }
    },
    [
      clearHoldTimer,
      clearLongPressTimer,
      hitTestZone,
      isHoldMode,
      isRitualMode,
      isSearchEnabled,
      isSwipeEnabled,
      openCaptureSheet,
      showSearchNotice,
    ]
  );

  const completeHoldAction = useCallback(
    (zone: HoldZone) => {
      if (zone === "left") {
        openModeSheet();
        showZoneNotice("mode");
      } else if (zone === "up") {
        openCaptureSheet();
        showZoneNotice("capture");
      } else if (zone === "right") {
        if (!isSearchEnabled) {
          showSearchNotice();
        }
        showZoneNotice("search");
      }
    },
    [isSearchEnabled, openCaptureSheet, openModeSheet, showSearchNotice, showZoneNotice]
  );

  const endPress = useCallback(
    (point: Point) => {
      if (!startPointRef.current) return;
      clearHoldTimer();
      clearLongPressTimer();

      if (isHoldMode) {
        const zone = hitTestZone(point);
        resetHoldState();
        if (zone) {
          completeHoldAction(zone);
        }
        startPointRef.current = null;
        return;
      }

      const shouldTap =
        !swipedRef.current && !movedRef.current && !longPressTriggeredRef.current;

      startPointRef.current = null;

      if (!shouldTap) return;
      if (isRitualMode) {
        showRitualNotice();
        return;
      }
      openModeSheet();
    },
    [
      clearHoldTimer,
      clearLongPressTimer,
      completeHoldAction,
      hitTestZone,
      isHoldMode,
      isRitualMode,
      openModeSheet,
      resetHoldState,
      showRitualNotice,
    ]
  );

  const cancelPress = useCallback(() => {
    clearHoldTimer();
    clearLongPressTimer();
    resetHoldState();
    startPointRef.current = null;
  }, [clearHoldTimer, clearLongPressTimer, resetHoldState]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (touchActiveRef.current) return;
    if (isAnimating) return;
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginPress({ x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (touchActiveRef.current) return;
    movePress({ x: event.clientX, y: event.clientY }, event.nativeEvent);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (touchActiveRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    endPress({ x: event.clientX, y: event.clientY });
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (touchActiveRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    cancelPress();
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

  useEffect(() => {
    if (isHoldMode) return;
    if (dragOffset.x !== 0 || dragOffset.y !== 0) return;
    computeZonePositions();
  }, [computeZonePositions, dragOffset.x, dragOffset.y, isHoldMode]);

  useEffect(() => {
    const handleResize = () => {
      if (isHoldMode) return;
      if (dragOffset.x !== 0 || dragOffset.y !== 0) return;
      computeZonePositions();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [computeZonePositions, dragOffset.x, dragOffset.y, isHoldMode]);

  useEffect(() => {
    const node = buttonWrapperRef.current;
    if (!node) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      touchActiveRef.current = true;
      const touch = event.touches[0];
      beginPress({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      movePress({ x: touch.clientX, y: touch.clientY }, event);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (touch) {
        endPress({ x: touch.clientX, y: touch.clientY });
      } else {
        cancelPress();
      }
      touchActiveRef.current = false;
    };

    const handleTouchCancel = () => {
      touchActiveRef.current = false;
      cancelPress();
    };

    node.addEventListener("touchstart", handleTouchStart, { passive: true });
    node.addEventListener("touchmove", handleTouchMove, { passive: false });
    node.addEventListener("touchend", handleTouchEnd);
    node.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [beginPress, cancelPress, endPress, movePress]);

  const shouldRender = shouldShow || isModeOpen || isCaptureOpen;
  const showButton = shouldShow && !isCaptureOpen && !isModeOpen;

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {showButton && (
        <div
          ref={buttonWrapperRef}
          className={styles.buttonWrapper}
          style={
            {
              "--mode-drag-x": `${dragOffset.x}px`,
              "--mode-drag-y": `${dragOffset.y}px`,
            } as React.CSSProperties
          }
        >
          <Tooltip open={isRitualNoticeOpen}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`${styles.modeButton} ${isHoldMode ? styles.modeButtonHold : ""} ${activeZone === "left" ? styles.modeButtonZoneLeft : ""} ${activeZone === "right" ? styles.modeButtonZoneRight : ""} ${activeZone === "up" ? styles.modeButtonZoneUp : ""}`}
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
          <Tooltip open={isSearchNoticeOpen}>
            <TooltipTrigger asChild>
              <span className={styles.noticeAnchor} aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={10}
              className={styles.ritualNotice}
            >
              Search to be enabled
            </TooltipContent>
          </Tooltip>
          <Tooltip open={zoneNotice !== null}>
            <TooltipTrigger asChild>
              <span className={styles.noticeAnchor} aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={10}
              className={styles.ritualNotice}
            >
              {zoneNotice === "mode"
                ? "Mode zone"
                : zoneNotice === "search"
                  ? "Search zone"
                  : zoneNotice === "capture"
                    ? "Capture zone"
                    : ""}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {isHoldMode && (
        <div className={styles.zonesRoot} aria-hidden="true">
          <div
            ref={leftZoneRef}
            className={`${styles.zone} ${styles.zoneLeft} ${activeZone === "left" ? styles.zoneActive : ""}`}
            style={
              zonePositions
                ? { left: zonePositions.left.x, top: zonePositions.left.y }
                : undefined
            }
          >
            Mode
          </div>
          <div
            ref={rightZoneRef}
            className={`${styles.zone} ${styles.zoneRight} ${activeZone === "right" ? styles.zoneActive : ""}`}
            style={
              zonePositions
                ? { left: zonePositions.right.x, top: zonePositions.right.y }
                : undefined
            }
          >
            Search
          </div>
          <div
            ref={upZoneRef}
            className={`${styles.zone} ${styles.zoneUp} ${activeZone === "up" ? styles.zoneActive : ""}`}
            style={
              zonePositions
                ? { left: zonePositions.up.x, top: zonePositions.up.y }
                : undefined
            }
          >
            Capture
          </div>
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
