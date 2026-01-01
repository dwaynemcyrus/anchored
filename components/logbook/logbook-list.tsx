"use client";

import { format, isSameMonth, startOfMonth } from "date-fns";
import { LogbookItem } from "./logbook-item";
import type {
  LogbookItem as LogbookItemType,
  LogbookState,
} from "@/lib/hooks/use-logbook";

interface LogbookListProps {
  items: LogbookItemType[];
  state: LogbookState;
  onRestore: (item: LogbookItemType) => void;
  onPermanentDelete: (item: LogbookItemType) => void;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

// Group items by month
function groupByMonth(
  items: LogbookItemType[]
): Map<string, LogbookItemType[]> {
  const groups = new Map<string, LogbookItemType[]>();

  items.forEach((item) => {
    const monthStart = startOfMonth(new Date(item.logbookDate));
    const key = format(monthStart, "yyyy-MM");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return groups;
}

export function LogbookList({
  items,
  state,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: LogbookListProps) {
  const groupedItems = groupByMonth(items);

  return (
    <div className="space-y-8">
      {Array.from(groupedItems.entries()).map(([monthKey, monthItems]) => {
        const monthDate = new Date(monthKey + "-01");
        const monthLabel = format(monthDate, "MMMM yyyy");

        return (
          <div key={monthKey}>
            {/* Month header */}
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              {monthLabel}
            </h2>

            {/* Items */}
            <div className="space-y-1">
              {monthItems.map((item) => (
                <LogbookItem
                  key={`${item.entityType}-${item.id}`}
                  item={item}
                  state={state}
                  onRestore={() => onRestore(item)}
                  onPermanentDelete={() => onPermanentDelete(item)}
                  isRestoring={isRestoring}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
