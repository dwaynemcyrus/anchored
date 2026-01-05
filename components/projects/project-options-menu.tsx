"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import styles from "./project-options-menu.module.css";

interface ProjectOptionsMenuProps {
  onEditDetails?: () => void;
  label?: string;
  status?: "backlog" | "active" | "paused" | "complete" | "archived" | "cancelled";
  onStatusChange?: (status: "active" | "paused" | "complete" | "archived" | "cancelled") => void;
}

export function ProjectOptionsMenu({
  onEditDetails,
  label = "More",
  status,
  onStatusChange,
}: ProjectOptionsMenuProps) {
  const editDisabled = !onEditDetails;
  const statusLabel = status ? status[0].toUpperCase() + status.slice(1) : "Status";
  const statusOptions = ["active", "paused", "complete", "archived", "cancelled"] as const;
  const statusOptionLabels: Record<(typeof statusOptions)[number], string> = {
    active: "Activate",
    paused: "Pause",
    complete: "Complete",
    archived: "Archive",
    cancelled: "Cancel",
  };

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
          {status && onStatusChange && (
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={styles.menuItem}>
                {statusLabel}
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  className={styles.menuContent}
                  alignOffset={-4}
                  sideOffset={6}
                >
                  {statusOptions.map((option) => (
                      <DropdownMenu.Item
                        key={option}
                        className={styles.menuItem}
                        onSelect={() => {
                          if (option === status) return;
                          onStatusChange(option);
                        }}
                      >
                        <span className={styles.menuItemLabel}>
                          {statusOptionLabels[option]}
                        </span>
                        {option === status && (
                          <span className={styles.menuItemCheck}>✓</span>
                        )}
                      </DropdownMenu.Item>
                    ))}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          )}
          <DropdownMenu.Item className={styles.menuItem}>
            Group &amp; Sort
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={styles.menuItem}
            disabled={editDisabled}
            onSelect={() => {
              if (!onEditDetails) return;
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
