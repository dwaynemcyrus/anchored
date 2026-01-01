"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { LogbookToggle } from "@/components/logbook/logbook-toggle";
import { LogbookDateRange } from "@/components/logbook/logbook-date-range";
import { LogbookList } from "@/components/logbook/logbook-list";
import { TaskListSkeleton } from "@/components/skeletons";
import {
  useLogbookItems,
  useRestoreLogbookItem,
  useHardDeleteLogbookItem,
  type LogbookState,
  type LogbookItem,
} from "@/lib/hooks/use-logbook";
import { subDays } from "date-fns";

type DateRangeOption = "7d" | "30d" | "90d" | "year" | "all" | "custom";

function getDateRangeFromOption(option: DateRangeOption): {
  from: Date;
  to: Date;
} {
  const to = new Date();
  switch (option) {
    case "7d":
      return { from: subDays(to, 7), to };
    case "30d":
      return { from: subDays(to, 30), to };
    case "90d":
      return { from: subDays(to, 90), to };
    case "year":
      return { from: subDays(to, 365), to };
    case "all":
      return { from: new Date(2020, 0, 1), to }; // Far back enough
    default:
      return { from: subDays(to, 30), to };
  }
}

export default function LogbookPage() {
  const [state, setState] = useState<LogbookState>("completed");
  const [dateRangeOption, setDateRangeOption] =
    useState<DateRangeOption>("30d");
  const [customRange, setCustomRange] = useState<{
    from: Date;
    to: Date;
  } | null>(null);

  const dateRange =
    dateRangeOption === "custom" && customRange
      ? customRange
      : getDateRangeFromOption(dateRangeOption);

  const { data: items, isLoading } = useLogbookItems({
    state,
    dateRange,
  });

  const restoreItem = useRestoreLogbookItem();
  const hardDeleteItem = useHardDeleteLogbookItem();

  const handleRestore = (item: LogbookItem) => {
    restoreItem.mutate(item, state);
  };

  const handlePermanentDelete = (item: LogbookItem) => {
    hardDeleteItem.mutate(item);
  };

  const handleDateRangeChange = (
    option: DateRangeOption,
    custom?: { from: Date; to: Date }
  ) => {
    setDateRangeOption(option);
    if (option === "custom" && custom) {
      setCustomRange(custom);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Archive className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Logbook</h1>
          <p className="text-sm text-muted-foreground">
            Completed and deleted items.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <LogbookToggle value={state} onChange={setState} />
        <LogbookDateRange
          value={dateRangeOption}
          customRange={customRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <TaskListSkeleton count={6} />
      ) : items && items.length > 0 ? (
        <LogbookList
          items={items}
          state={state}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          isRestoring={restoreItem.isPending}
          isDeleting={hardDeleteItem.isPending}
        />
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          <Archive className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p>
            No {state === "completed" ? "completed" : "deleted"} items in this
            date range.
          </p>
        </div>
      )}
    </div>
  );
}
