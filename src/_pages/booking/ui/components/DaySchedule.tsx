'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { hasStarted } from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import type { ZonedNow } from '@/shared/lib/time';
import { HOUR_MARKS, blockPosition, nowLinePosition, scheduleCells } from '../../lib/schedule';
import { BookingBlock } from './BookingBlock';

type Props = {
  date: string;
  now: ZonedNow;
  bookings: readonly Booking[];
  onCreate: (start: string) => void;
  onEdit: (booking: Booking) => void;
};

export const DaySchedule = ({ date, now, bookings, onCreate, onEdit }: Props) => {
  const t = useTranslations('booking.schedule');
  const nowLine = nowLinePosition(date, now);

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
      <div className="relative h-144 rounded-lg border">
        <ul aria-label={t('free')} className="flex h-full flex-col">
          {scheduleCells(date, now, bookings).map((cell) => (
            <li key={cell.start} className="flex-1 border-b border-dashed last:border-b-0">
              {cell.free ? (
                <button
                  type="button"
                  aria-label={t('bookFrom', { time: cell.start })}
                  onClick={() => onCreate(cell.start)}
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
