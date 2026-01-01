"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateRangeOption = "7d" | "30d" | "90d" | "year" | "all" | "custom";

interface LogbookDateRangeProps {
  value: DateRangeOption;
  customRange: { from: Date; to: Date } | null;
  onChange: (
    option: DateRangeOption,
    customRange?: { from: Date; to: Date }
  ) => void;
}

const dateRangeLabels: Record<DateRangeOption, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  year: "This year",
  all: "All time",
  custom: "Custom range",
};

export function LogbookDateRange({
  value,
  customRange,
  onChange,
}: LogbookDateRangeProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempRange, setTempRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const handleSelectChange = (newValue: DateRangeOption) => {
    if (newValue === "custom") {
      setShowCustomPicker(true);
    } else {
      onChange(newValue);
    }
  };

  const handleCustomRangeApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange("custom", { from: tempRange.from, to: tempRange.to });
      setShowCustomPicker(false);
    }
  };

  const displayValue =
    value === "custom" && customRange
      ? `${format(customRange.from, "MMM d")} - ${format(customRange.to, "MMM d, yyyy")}`
      : dateRangeLabels[value];

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="year">This year</SelectItem>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="custom">Custom range...</SelectItem>
        </SelectContent>
      </Select>

      {showCustomPicker && (
        <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Pick dates
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">From</p>
                <Calendar
                  mode="single"
                  selected={tempRange.from}
                  onSelect={(date) =>
                    setTempRange((prev) => ({ ...prev, from: date }))
                  }
                  initialFocus
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">To</p>
                <Calendar
                  mode="single"
                  selected={tempRange.to}
                  onSelect={(date) =>
                    setTempRange((prev) => ({ ...prev, to: date }))
                  }
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleCustomRangeApply}
                disabled={!tempRange.from || !tempRange.to}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
