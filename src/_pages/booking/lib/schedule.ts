import {
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  SLOT_STEP_MIN,
  WORKDAY_END,
  WORKDAY_START,
} from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import { toMinutes, toTime } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';

const DAY_START = toMinutes(WORKDAY_START);
const DAY_END = toMinutes(WORKDAY_END);
const DAY_LENGTH = DAY_END - DAY_START;
const CELL_MIN = 30;
const DEFAULT_DURATION_MIN = 60;

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

export const START_TIMES = range(DAY_START, DAY_END - MIN_DURATION_MIN, SLOT_STEP_MIN).map(toTime);
export const END_TIMES = range(DAY_START + MIN_DURATION_MIN, DAY_END, SLOT_STEP_MIN).map(toTime);
export const HOUR_MARKS = range(DAY_START, DAY_END, 60).map(toTime);

export type DayStatus = 'past' | 'today' | 'future';

export const dayStatus = (date: string, now: ZonedNow): DayStatus =>
  date < now.date ? 'past' : date === now.date ? 'today' : 'future';

const isPastStart = (start: number, date: string, now: ZonedNow) =>
  date < now.date || (date === now.date && start < now.minutes);

export const isStartDisabled = (start: string, date: string, now: ZonedNow) =>
  isPastStart(toMinutes(start), date, now);

export const isEndDisabled = (end: string, start: string) => {
  const duration = toMinutes(end) - toMinutes(start);
  return duration < MIN_DURATION_MIN || duration > MAX_DURATION_MIN;
};

export const defaultEnd = (start: string) =>
  toTime(Math.min(toMinutes(start) + DEFAULT_DURATION_MIN, DAY_END));

export const firstFreeStart = (date: string, now: ZonedNow, bookings: readonly Booking[]) =>
  START_TIMES.find((start) => {
    const from = toMinutes(start);
    return (
      !isPastStart(from, date, now) &&
      !bookings.some((b) => from < toMinutes(b.end) && toMinutes(b.start) < from + MIN_DURATION_MIN)
    );
  }) ?? null;

export type ScheduleCell = { start: string; end: string; free: boolean; past: boolean };

export const scheduleCells = (
  date: string,
  now: ZonedNow,
  bookings: readonly Booking[],
): ScheduleCell[] =>
  range(DAY_START, DAY_END - CELL_MIN, CELL_MIN).map((from) => {
    const to = from + CELL_MIN;
    const past = isPastStart(from, date, now);
    const busy = bookings.some((b) => from < toMinutes(b.end) && toMinutes(b.start) < to);
    return { start: toTime(from), end: toTime(to), free: !past && !busy, past };
  });

export const blockPosition = (start: string, end: string) => ({
  top: `${((toMinutes(start) - DAY_START) / DAY_LENGTH) * 100}%`,
  height: `${((toMinutes(end) - toMinutes(start)) / DAY_LENGTH) * 100}%`,
});

export const nowLinePosition = (date: string, now: ZonedNow) =>
  date === now.date && now.minutes >= DAY_START && now.minutes <= DAY_END
    ? `${((now.minutes - DAY_START) / DAY_LENGTH) * 100}%`
    : null;
