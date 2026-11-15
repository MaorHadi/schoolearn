import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { he } from "date-fns/locale";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { t } from "~/i18n";
import { toIsoDate } from "~/shared/date-range";

// Fixed zone so server and client render the same text (no hydration mismatch).
const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeZone: "UTC" });

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Midnight UTC of a day the calendar picked (it hands back local midnight). */
function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function DatePicker({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled: (date: Date) => boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-w-36 flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input type="hidden" name={name} value={value ? toIsoDate(value) : ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 justify-start border-2 border-input bg-secondary font-normal text-foreground shadow-none hover:bg-accent"
            aria-label={label}
          >
            <CalendarIcon aria-hidden="true" />
            {value ? dateFormat.format(value) : t("dateRange.pick")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={he}
            dir="rtl"
            selected={value}
            defaultMonth={value}
            disabled={disabled}
            onSelect={(date) => {
              onChange(date ? toUtcDay(date) : undefined);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DateRangeFieldsProps {
  /** Field names submitted with the form; default `from` and `to`. */
  names?: { from: string; to: string };
  /** Initial values as `yyyy-mm-dd`. */
  defaultFrom?: string;
  defaultTo?: string;
}

/**
 * Two linked date pickers that post `from` and `to` as `yyyy-mm-dd` hidden fields. The start
 * cannot be after the end and vice versa. Works inside any `<Form>`; parse with
 * DateRangeQuerySchema and resolve with resolveDateRange().
 */
export function DateRangeFields({
  names = { from: "from", to: "to" },
  defaultFrom,
  defaultTo,
}: DateRangeFieldsProps) {
  const [from, setFrom] = useState<Date | undefined>(() => parseIsoDate(defaultFrom));
  const [to, setTo] = useState<Date | undefined>(() => parseIsoDate(defaultTo));
  return (
    <div className="flex flex-wrap items-end gap-3">
      <DatePicker
        name={names.from}
        label={t("dateRange.from")}
        value={from}
        onChange={setFrom}
        disabled={(date) => (to ? toUtcDay(date) > to : false)}
      />
      <DatePicker
        name={names.to}
        label={t("dateRange.to")}
        value={to}
        onChange={setTo}
        disabled={(date) => (from ? toUtcDay(date) < from : false)}
      />
    </div>
  );
}
