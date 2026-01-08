"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import layoutStyles from "./app-shell.module.css";
import styles from "./push-overlay-stack.module.css";

type RouteInfo = {
  depth: number;
  parent: string | null;
};

type Layer = {
  path: string;
  depth: number;
  node: React.ReactNode;
};

const ANIMATION_MS = 300;

const getRouteInfo = (pathname: string): RouteInfo | null => {
  if (pathname === "/command") {
    return { depth: 0, parent: null };
  }
  if (pathname === "/projects") {
    return { depth: 1, parent: "/command" };
  }
  if (pathname.startsWith("/projects/")) {
    return { depth: 2, parent: "/projects" };
  }
  return null;
};

interface PushOverlayStackProps {
  children: React.ReactNode;
  searchScopeRef: React.RefObject<HTMLDivElement | null>;
}

export function PushOverlayStack({
  children,
  searchScopeRef,
}: PushOverlayStackProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeInfo = useMemo(() => getRouteInfo(pathname), [pathname]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [incomingPath, setIncomingPath] = useState<string | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const prevDepthRef = useRef<number | null>(null);
  const nodeCacheRef = useRef<Map<string, React.ReactNode>>(new Map());
  const pathOrderRef = useRef<string[]>([]);
  const dragStartXRef = useRef(0);
  const dragActiveRef = useRef(false);
  const dismissTimeoutRef = useRef<number | null>(null);
  const topLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!routeInfo) {
      setLayers([{ path: pathname, depth: 0, node: children }]);
      prevDepthRef.current = null;
      return;
    }

    nodeCacheRef.current.set(pathname, children);
    if (pathOrderRef.current[pathOrderRef.current.length - 1] !== pathname) {
      pathOrderRef.current = [...pathOrderRef.current, pathname];
    }

    setLayers(() => {
      const nextLayers: Layer[] = [];
      for (const path of pathOrderRef.current) {
        const info = getRouteInfo(path);
        if (!info || info.depth > routeInfo.depth) continue;
        const node = nodeCacheRef.current.get(path);
        if (!node) continue;
        nextLayers.push({ path, depth: info.depth, node });
      }
      return nextLayers;
    });

    if (prevDepthRef.current !== null && routeInfo.depth > prevDepthRef.current) {
      setIncomingPath(pathname);
      requestAnimationFrame(() => setIncomingPath(null));
    }
    prevDepthRef.current = routeInfo.depth;
  }, [children, pathname, routeInfo]);

  useEffect(() => {
    setDragX(0);
    setIsDragging(false);
    setIsDismissing(false);
    dragActiveRef.current = false;
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        window.clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback((parent: string | null) => {
    if (!parent) return;
    setIsDismissing(true);
    setDragX(window.innerWidth);
    dismissTimeoutRef.current = window.setTimeout(() => {
      router.push(parent);
    }, ANIMATION_MS);
  }, [router]);

  const startDrag = useCallback((clientX: number, parent: string | null) => {
    if (!parent) return;
    dragActiveRef.current = true;
    dragStartXRef.current = clientX;
    setIsDragging(true);
  }, []);

  const updateDrag = useCallback((clientX: number) => {
    if (!dragActiveRef.current) return;
    const nextX = Math.max(0, clientX - dragStartXRef.current);
    setDragX(nextX);
  }, []);

  const endDrag = useCallback((parent: string | null) => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    setIsDragging(false);
    const threshold = window.innerWidth * 0.7;
    if (dragX >= threshold) {
      handleDismiss(parent);
      return;
    }
    setDragX(0);
  }, [dragX, handleDismiss]);

  useEffect(() => {
    const node = topLayerRef.current;
    if (!node) return;
    const parentRoute = layers.length
      ? getRouteInfo(layers[layers.length - 1].path)?.parent ?? null
      : null;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      startDrag(event.touches[0].clientX, parentRoute);
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!dragActiveRef.current) return;
      event.preventDefault();
      if (event.touches.length !== 1) return;
      updateDrag(event.touches[0].clientX);
    };
    const handleTouchEnd = () => {
      endDrag(parentRoute);
    };
    const handleTouchCancel = () => {
      endDrag(parentRoute);
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
  }, [endDrag, layers, startDrag, updateDrag]);

  if (!routeInfo) {
    return (
      <div className={styles.singleLayer}>
        <div className={layoutStyles.container} ref={searchScopeRef}>
          {children}
        </div>
      </div>
    );
  }

  const topIndex = layers.length - 1;
  const backdropIndex = topIndex - 1;
  const topLayer = layers[topIndex];
  const topParent = topLayer ? getRouteInfo(topLayer.path)?.parent ?? null : null;

  return (
    <div className={styles.stackRoot}>
      {layers.map((layer, index) => {
        const isTop = index === topIndex;
        const isIncoming = isTop && incomingPath === layer.path;
        const transform =
          isTop && (dragX > 0 || isDragging || isDismissing)
            ? `translateX(${dragX}px)`
            : isIncoming
              ? "translateX(100%)"
              : "translateX(0px)";

        return (
          <div
            key={layer.path}
            className={styles.layer}
            style={{ zIndex: 100 + index * 2 }}
          >
            <div
              ref={isTop ? topLayerRef : null}
              className={`${styles.panel} ${isTop ? styles.panelTop : ""} ${
                isDragging ? styles.panelDragging : ""
              }`}
              style={{
                transform,
                transition: isDragging ? "none" : `transform ${ANIMATION_MS}ms ease`,
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                startDrag(event.clientX, topParent);
              }}
              onPointerMove={(event) => {
                if (!dragActiveRef.current) return;
                event.preventDefault();
                updateDrag(event.clientX);
              }}
              onPointerUp={() => endDrag(topParent)}
              onPointerCancel={() => endDrag(topParent)}
            >
              <div
                className={layoutStyles.container}
                ref={isTop ? searchScopeRef : null}
              >
                {layer.node}
              </div>
            </div>
          </div>
        );
      })}
      {backdropIndex >= 0 ? (
        <div
          className={styles.backdrop}
          style={{ zIndex: 100 + backdropIndex * 2 + 1 }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
