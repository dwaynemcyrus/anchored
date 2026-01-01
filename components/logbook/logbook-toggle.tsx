"use client";

import { cn } from "@/lib/utils";
import type { LogbookState } from "@/lib/hooks/use-logbook";

interface LogbookToggleProps {
  value: LogbookState;
  onChange: (value: LogbookState) => void;
}

export function LogbookToggle({ value, onChange }: LogbookToggleProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange("completed")}
        className={cn(
          "rounded px-3 py-1.5 text-sm font-medium transition-colors",
          value === "completed"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Completed
      </button>
      <button
        type="button"
        onClick={() => onChange("deleted")}
        className={cn(
          "rounded px-3 py-1.5 text-sm font-medium transition-colors",
          value === "deleted"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Deleted
      </button>
    </div>
  );
}
