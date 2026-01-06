"use client";

import { useEffect, type ReactNode } from "react";
import { useRitualModeStore } from "@/lib/stores/ritual-mode-store";
import styles from "./layout.module.css";

export default function ReviewLayout({ children }: { children: ReactNode }) {
  const { enableRitualMode, disableRitualMode } = useRitualModeStore();

  useEffect(() => {
    enableRitualMode();
    return () => {
      disableRitualMode();
    };
  }, [enableRitualMode, disableRitualMode]);

  return <div className={styles.shell}>{children}</div>;
}
