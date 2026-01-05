"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import styles from "./inbox-options-menu.module.css";

interface InboxOptionsMenuProps {
  onEndReview: () => void;
  onView?: () => void;
  label?: string;
}

export function InboxOptionsMenu({
  onEndReview,
  onView,
  label = "More",
}: InboxOptionsMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label="Inbox options">
          {label}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menuContent}
          align="end"
          sideOffset={6}
        >
          <DropdownMenu.Item
            className={styles.menuItem}
            onSelect={() => {
              onView?.();
            }}
          >
            View
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={styles.menuItem}
            onSelect={onEndReview}
          >
            End review
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
