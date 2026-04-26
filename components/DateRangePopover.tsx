'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type DateRangeValue = { start: Date; end: Date };

function todayRange(): DateRangeValue {
  const d = startOfDay(new Date());
  return { start: d, end: d };
}

function thisWeekRange(): DateRangeValue {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 0 }),
    end: endOfWeek(now, { weekStartsOn: 0 }),
  };
}

function thisMonthRange(): DateRangeValue {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

function normalizeRange(a: Date, b: Date): DateRangeValue {
  const s = startOfDay(a);
  const e = startOfDay(b);
  return isAfter(s, e) ? { start: e, end: s } : { start: s, end: e };
}

interface DateRangePopoverProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  align?: 'start' | 'center' | 'end';
  rangeLabel: string;
}

export default function DateRangePopover({
  value,
  onChange,
  align = 'end',
  rangeLabel,
}: DateRangePopoverProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value.start));
  const [anchor, setAnchor] = useState<Date | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleMonth(startOfMonth(value.start));
      setAnchor(null);
    }
  }, [open, value.start]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const weekLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleDayClick = (day: Date) => {
    const d = startOfDay(day);
    if (!anchor) {
      setAnchor(d);
      return;
    }
    onChange(normalizeRange(anchor, d));
    setAnchor(null);
    setOpen(false);
  };

  const shortcut = (range: DateRangeValue) => {
    onChange(range);
    setAnchor(null);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Date range"
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-800',
            open && 'border-sky-400 text-sky-900 ring-2 ring-sky-100'
          )}
        >
          <CalendarRange className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-[100] w-[220px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg shadow-slate-900/10 outline-none"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {rangeLabel}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-800">
            {format(value.start, 'MMM d')} – {format(value.end, 'MMM d, yyyy')}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {(
              [
                { key: 'today', label: 'Today', fn: todayRange },
                { key: 'week', label: 'This week', fn: thisWeekRange },
                { key: 'month', label: 'This month', fn: thisMonthRange },
              ] as const
            ).map(({ key, label, fn }) => (
              <button
                key={key}
                type="button"
                onClick={() => shortcut(fn())}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <button
                type="button"
                className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
                onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-semibold text-slate-800">
                {format(visibleMonth, 'MMM yyyy')}
              </span>
              <button
                type="button"
                className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
                onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-px text-center text-[9px] font-medium text-slate-400">
              {weekLabels.map((w) => (
                <div key={w} className="py-0.5">
                  {w}
                </div>
              ))}
            </div>

            <div className="mt-0.5 grid grid-cols-7 gap-px">
              {days.map((day) => {
                const muted = !isSameMonth(day, visibleMonth);
                const d = startOfDay(day);
                const pickingAnchor = anchor && isSameDay(d, anchor);
                const inCommitted =
                  !anchor &&
                  (isAfter(d, value.start) || isSameDay(d, value.start)) &&
                  (isBefore(d, value.end) || isSameDay(d, value.end));
                const endpoint =
                  !anchor && (isSameDay(d, value.start) || isSameDay(d, value.end));

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'flex h-7 items-center justify-center rounded text-[11px] font-medium transition-colors',
                      muted && 'text-slate-300',
                      !muted && 'text-slate-800',
                      pickingAnchor && 'bg-sky-600 text-white ring-1 ring-sky-700',
                      !pickingAnchor && endpoint && 'bg-[#1E3A5F] text-white',
                      !pickingAnchor && !endpoint && inCommitted && 'bg-sky-100'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[9px] leading-tight text-slate-500">
              Click two dates for a range. Shortcuts apply instantly.
            </p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
