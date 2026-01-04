"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import styles from "./new-task-card.module.css";

interface NewTaskCardProps {
  onSaved?: () => void;
  focusOnMount?: boolean;
  focusOnSave?: boolean;
  footerLeft?: React.ReactNode;
}

type Destination =
  | { type: "inbox"; label: "Inbox" }
  | { type: "none"; label: "Anytime" }
  | { type: "project"; label: string; projectId: string };

export function NewTaskCard({
  onSaved,
  focusOnMount = false,
  focusOnSave = false,
  footerLeft,
}: NewTaskCardProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWhenOpen, setIsWhenOpen] = useState(false);
  const [isWhenCalendarView, setIsWhenCalendarView] = useState(false);
  const [whenMode, setWhenMode] = useState<"start" | "due">("start");
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>();
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>();
  const [destination, setDestination] = useState<Destination>({
    type: "inbox",
    label: "Inbox",
  });
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const createTask = useCreateTask();
  const { data: projects = [] } = useProjects();
  const destinationRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const isSaving = createTask.isPending;

  useEffect(() => {
    if (!isDestinationOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        destinationRef.current &&
        !destinationRef.current.contains(event.target as Node)
      ) {
        setIsDestinationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDestinationOpen]);

  useEffect(() => {
    if (!focusOnMount) return;
    titleInputRef.current?.focus();
  }, [focusOnMount]);

  const availableProjects = projects.filter((project) => {
    const status = project.status?.toLowerCase();
    return status !== "complete" && status !== "archived" && status !== "cancelled";
  });

  const handleSelectDestination = (next: Destination) => {
    setDestination(next);
    setIsDestinationOpen(false);
  };

  const taskLocationForDestination = (next: Destination) => {
    if (next.type === "inbox") return "inbox";
    if (next.type === "none") return "anytime";
    return "project";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setError(null);

    try {
      await createTask.mutateAsync({
        title: trimmedTitle,
        notes: null,
        project_id: destination.type === "project" ? destination.projectId : null,
        task_location: taskLocationForDestination(destination),
        start_date: selectedStartDate ? selectedStartDate.toISOString() : null,
        due_date: selectedDueDate ? selectedDueDate.toISOString() : null,
      });
      setTitle("");
      if (focusOnSave) {
        titleInputRef.current?.focus();
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save action.");
    }
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.fieldGroup}>
        <textarea
          ref={titleInputRef}
          className={styles.input}
          placeholder="What's on your mind?"
          aria-label="Capture"
          rows={2}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          disabled={isSaving}
        />
      </div>

      {(selectedStartDate || selectedDueDate) && (
        <div className={styles.whenSummary}>
          <button
            type="button"
            className={styles.whenSummaryButton}
            onClick={() => {
              setWhenMode("start");
              setIsWhenOpen(true);
            }}
          >
            Start: {selectedStartDate ? format(selectedStartDate, "MMM d") : "None"}
          </button>
          <button
            type="button"
            className={styles.whenSummaryButton}
            onClick={() => {
              setWhenMode("due");
              setIsWhenOpen(true);
            }}
          >
            Due: {selectedDueDate ? format(selectedDueDate, "MMM d") : "None"}
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        {footerLeft ?? (
          <div className={styles.destination} ref={destinationRef}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => setIsDestinationOpen((open) => !open)}
              disabled={isSaving}
            >
              {destination.label}
            </button>
            {isDestinationOpen && (
              <div
                className={styles.destinationMenuOverlay}
                onClick={() => setIsDestinationOpen(false)}
              >
                <div
                  className={styles.destinationMenu}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className={styles.destinationMenuHeader}>
                    <span className={styles.destinationMenuTitle}>Move</span>
                    <button
                      type="button"
                      className={styles.destinationMenuClose}
                      onClick={() => setIsDestinationOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div className={styles.destinationMenuList}>
                    <button
                      type="button"
                      className={`${styles.destinationItem} ${destination.type === "inbox" ? styles.destinationItemSelected : ""}`}
                      onClick={() =>
                        handleSelectDestination({
                          type: "inbox",
                          label: "Inbox",
                        })
                      }
                    >
                      Inbox
                    </button>
                    <button
                      type="button"
                      className={`${styles.destinationItem} ${destination.type === "none" ? styles.destinationItemSelected : ""}`}
                      onClick={() =>
                        handleSelectDestination({
                          type: "none",
                          label: "Anytime",
                        })
                      }
                    >
                      Anytime
                    </button>
                    <div className={styles.destinationMenuDivider} />
                    {availableProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        className={`${styles.destinationItem} ${destination.type === "project" && destination.projectId === project.id ? styles.destinationItemSelected : ""}`}
                        onClick={() =>
                          handleSelectDestination({
                            type: "project",
                            label: project.title,
                            projectId: project.id,
                          })
                        }
                      >
                        {project.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <button type="submit" className={styles.saveButton} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {isWhenOpen && (
        <div
          className={styles.whenOverlay}
          onClick={() => {
            setIsWhenOpen(false);
            setIsWhenCalendarView(false);
          }}
        >
          <div
            className={styles.whenPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.whenHeader}>
              {isWhenCalendarView ? (
                <button
                  type="button"
                  className={styles.whenNavButton}
                  onClick={() => setIsWhenCalendarView(false)}
                >
                  ‹
                </button>
              ) : (
                <span />
              )}
              <span className={styles.whenTitle}>When?</span>
              <button
                type="button"
                className={styles.whenClose}
                onClick={() => setIsWhenOpen(false)}
              >
                X
              </button>
            </div>

            {!isWhenCalendarView && (
              <div className={styles.whenQuickList}>
                <button type="button" className={styles.whenQuickItem}>
                  Today
                </button>
                <button type="button" className={styles.whenQuickItem}>
                  This Evening
                </button>
                <button type="button" className={styles.whenQuickItem}>
                  Someday
                </button>
                <button type="button" className={styles.whenQuickItem}>
                  Add Reminder
                </button>
              </div>
            )}

            <div
              className={
                isWhenCalendarView
                  ? styles.whenCalendarScroll
                  : styles.whenCalendar
              }
            >
              <Calendar
                mode="single"
                selected={whenMode === "start" ? selectedStartDate : selectedDueDate}
                onSelect={(date) => {
                  if (whenMode === "start") {
                    setSelectedStartDate(date ?? undefined);
                  } else {
                    setSelectedDueDate(date ?? undefined);
                  }
                  if (date && isWhenCalendarView) {
                    setIsWhenCalendarView(false);
                  }
                }}
                numberOfMonths={isWhenCalendarView ? 12 : 1}
                showOutsideDays={!isWhenCalendarView}
                className={styles.whenCalendarWidget}
                classNames={{
                  nav: styles.whenCalendarNavHidden,
                  months: isWhenCalendarView
                    ? styles.whenCalendarMonthsScroll
                    : styles.whenCalendarMonths,
                  month: styles.whenCalendarMonth,
                  month_caption: styles.whenCalendarCaption,
                  caption_label: styles.whenCalendarCaptionLabel,
                  weekday: styles.whenCalendarWeekday,
                  week: styles.whenCalendarWeek,
                  day: styles.whenCalendarDay,
                }}
              />
            </div>

            {!isWhenCalendarView && (
              <button
                type="button"
                className={styles.whenCalendarExpand}
                onClick={() => setIsWhenCalendarView(true)}
                aria-label="Open calendar"
              >
                ›
              </button>
            )}

            <div className={styles.whenModalSummary}>
              {selectedStartDate ? (
                <span className={styles.whenModalSummaryItem}>
                  Start: {format(selectedStartDate, "MMM d")}
                </span>
              ) : (
                <span className={styles.whenModalSummaryItem}>Start: None</span>
              )}
              {selectedDueDate ? (
                <span className={styles.whenModalSummaryItem}>
                  Due: {format(selectedDueDate, "MMM d")}
                </span>
              ) : (
                <span className={styles.whenModalSummaryItem}>Due: None</span>
              )}
            </div>

            <div className={styles.whenToggle}>
              <button
                type="button"
                className={
                  whenMode === "start"
                    ? styles.whenToggleChipActive
                    : styles.whenToggleChip
                }
                onClick={() => setWhenMode("start")}
              >
                Start date
              </button>
              <button
                type="button"
                className={
                  whenMode === "due"
                    ? styles.whenToggleChipActive
                    : styles.whenToggleChip
                }
                onClick={() => setWhenMode("due")}
              >
                Due date
              </button>
            </div>

            <div className={styles.whenModalActions}>
              <button
                type="button"
                className={styles.whenModalSave}
                onClick={() => {
                  setIsWhenOpen(false);
                  setIsWhenCalendarView(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
