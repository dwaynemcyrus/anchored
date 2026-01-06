"use client";

import type { ReactNode } from "react";
import styles from "./layout.module.css";

export default function AnytimeLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
