'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { hasStarted } from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import type { ZonedNow } from '@/shared/lib/time';
import { cn } from 'cn';
import { HOUR_MARKS, blockPosition, nowLinePosition, scheduleCells } from '../../lib/schedule';
import { useDragSelect } from '../../model/useDragSelect';
import { BookingBlock } from './BookingBlock';

type Props = {
  date: string;
  now: ZonedNow;
  bookings: readonly Booking[];
  isStale: boolean;
  onCreate: (start: string, end?: string) => void;
  onEdit: (booking: Booking) => void;
};

export const DaySchedule = ({ date, now, bookings, isStale, onCreate, onEdit }: Props) => {
  const t = useTranslations('booking.schedule');
  const nowLine = nowLinePosition(date, now);
  const { preview, isDragging, handlers } = useDragSelect({
    date,
    now,
    bookings,
    onSelect: onCreate,
  });

  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
      <ol aria-hidden className="relative h-144">
        {HOUR_MARKS.map((time) => (
          <li
            key={time}
            style={blockPosition(time, time)}
            className="absolute right-0 -translate-y-1/2 font-mono text-xs text-muted-foreground"
          >
            {time}
          </li>
        ))}
      </ol>
      <div
        {...handlers}
        data-stale={isStale || undefined}
        aria-busy={isStale}
        className={cn(
          'relative h-144 rounded-lg border transition-opacity data-stale:pointer-events-none data-stale:opacity-60',
          isDragging && 'cursor-ns-resize select-none',
        )}
      >
        <ul aria-label={t('free')} className="flex h-full flex-col">
          {scheduleCells(date, now, bookings).map((cell) => (
            <li key={cell.start} className="flex-1 border-b border-dashed last:border-b-0">
              {cell.freeStart ? (
                <button
                  type="button"
                  aria-label={t('bookFrom', { time: cell.freeStart })}
                  onClick={() => cell.freeStart && onCreate(cell.freeStart)}
                  className="group flex size-full items-center justify-end px-3 text-muted-foreground outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <PlusIcon className="size-4 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                </button>
              ) : (
                <div className={cell.closed ? 'size-full bg-muted/60' : 'size-full'} />
              )}
            </li>
          ))}
        </ul>
        <ol aria-label={t('bookings')} className="pointer-events-none absolute inset-0 px-1">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              style={blockPosition(booking.start, booking.end)}
              className="pointer-events-auto absolute inset-x-1 py-px"
            >
              <BookingBlock
                booking={booking}
                isLocked={hasStarted(booking, now)}
                onEdit={() => onEdit(booking)}
              />
            </li>
          ))}
        </ol>
        {preview && (
          <div
            role="status"
            style={blockPosition(preview.start, preview.end)}
            className={cn(
              'pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed px-2 py-1 font-mono text-xs',
              preview.isValid
                ? 'border-info-border bg-info-soft/70 text-info-strong'
                : 'border-danger-border bg-danger-soft/70 text-danger-strong',
            )}
          >
            {preview.start}–{preview.end}
          </div>
        )}
        {nowLine && (
          <div
            aria-hidden
            style={{ top: nowLine }}
            className="pointer-events-none absolute inset-x-0 border-t-2 border-destructive"
          />
        )}
      </div>
    </div>
  );
};
