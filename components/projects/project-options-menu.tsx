"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import styles from "./project-options-menu.module.css";

interface ProjectOptionsMenuProps {
  onEditDetails?: () => void;
  label?: string;
}

export function ProjectOptionsMenu({
  onEditDetails,
  label = "More",
}: ProjectOptionsMenuProps) {
  const editDisabled = !onEditDetails;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label="Project options">
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
          <DropdownMenu.Item
            className={styles.menuItem}
            disabled={editDisabled}
            onSelect={(event) => {
              if (!onEditDetails) return;
              event.preventDefault();
              onEditDetails();
            }}
          >
            Edit Details
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.menuItem}>
            Manage Sections
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.menuItem}>
            View Options
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
