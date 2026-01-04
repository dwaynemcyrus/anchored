"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import styles from "./task-options-menu.module.css";

interface TaskOptionsMenuProps {
  label?: string;
}

export function TaskOptionsMenu({ label = "More" }: TaskOptionsMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label="Task options">
          {label}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menuContent}
          align="end"
          sideOffset={6}
        >
          <DropdownMenu.Item className={styles.menuItem}>
            Group &amp; Sort
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.menuItem}>
            Bulk Edit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
