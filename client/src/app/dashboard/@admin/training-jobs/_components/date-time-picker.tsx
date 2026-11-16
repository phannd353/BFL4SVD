"use client";

import { useState } from "react";
import { format, isBefore, isSameDay, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  id: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
}

function parseLocalDateTime(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toLocalDateTimeValue(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function DateTimePicker({
  id,
  value,
  min,
  onChange,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDateTime = parseLocalDateTime(value);
  const minimumDateTime = parseLocalDateTime(min || "");
  const minimumTime =
    selectedDateTime &&
    minimumDateTime &&
    isSameDay(selectedDateTime, minimumDateTime)
      ? format(minimumDateTime, "HH:mm")
      : undefined;

  const handleDateSelect = (date?: Date) => {
    if (!date) return;
    const nextDate = new Date(date);
    if (selectedDateTime) {
      nextDate.setHours(
        selectedDateTime.getHours(),
        selectedDateTime.getMinutes(),
        0,
        0,
      );
    }
    onChange(toLocalDateTimeValue(nextDate));
    setIsOpen(false);
  };

  const handleTimeChange = (time: string) => {
    if (!selectedDateTime || !time) return;
    const [hours, minutes] = time.split(":").map(Number);
    const nextDate = new Date(selectedDateTime);
    nextDate.setHours(hours, minutes, 0, 0);
    onChange(toLocalDateTimeValue(nextDate));
  };

  return (
    <div className="flex gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="min-w-0 flex-1 justify-start gap-2 font-normal"
              aria-label="Choose date"
            />
          }
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {selectedDateTime ? (
            format(selectedDateTime, "PPP")
          ) : (
            <span className="text-muted-foreground">Choose date</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDateTime}
            defaultMonth={selectedDateTime}
            captionLayout="dropdown"
            disabled={(date) =>
              Boolean(
                minimumDateTime &&
                  isBefore(startOfDay(date), startOfDay(minimumDateTime)),
              )
            }
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>
      <input
        type="time"
        aria-label="Choose time"
        className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
        value={selectedDateTime ? format(selectedDateTime, "HH:mm") : ""}
        min={minimumTime}
        disabled={!selectedDateTime}
        onChange={(event) => handleTimeChange(event.target.value)}
        required
      />
    </div>
  );
}
