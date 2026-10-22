import {
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  SLOT_STEP_MIN,
  WORKDAY_END,
  WORKDAY_START,
  isWorkday,
} from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import { toMinutes, toTime } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';
import type { Matcher } from 'react-day-picker';

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

const WEEKEND_MATCHER: Matcher = { dayOfWeek: [0, 6] };

export type DayStatus = 'past' | 'weekend' | 'today' | 'future';

export const dayStatus = (date: string, now: ZonedNow): DayStatus => {
  if (date < now.date) return 'past';
  if (!isWorkday(date)) return 'weekend';
  return date === now.date ? 'today' : 'future';
};

export const unavailableDays = (today: Date): Matcher[] => [{ before: today }, WEEKEND_MATCHER];

const isPastStart = (start: number, date: string, now: ZonedNow) =>
  date < now.date || (date === now.date && start < now.minutes);

const overlapsAny = (from: number, to: number, bookings: readonly Booking[]) =>
  bookings.some((b) => from < toMinutes(b.end) && toMinutes(b.start) < to);

export const isStartDisabled = (
  start: string,
  date: string,
  now: ZonedNow,
  bookings: readonly Booking[],
) => !isStartFree(toMinutes(start), date, now, bookings);

export const isEndDisabled = (end: string, start: string, bookings: readonly Booking[]) => {
  const from = toMinutes(start);
  const to = toMinutes(end);
  const duration = to - from;
  return (
    duration < MIN_DURATION_MIN || duration > MAX_DURATION_MIN || overlapsAny(from, to, bookings)
  );
};

export const defaultEnd = (start: string, bookings: readonly Booking[]) => {
  const preferred = toTime(Math.min(toMinutes(start) + DEFAULT_DURATION_MIN, DAY_END));
  if (!isEndDisabled(preferred, start, bookings)) return preferred;
  const valid = END_TIMES.filter((end) => !isEndDisabled(end, start, bookings));
  return valid.filter((end) => end <= preferred).at(-1) ?? valid[0] ?? preferred;
};

const isStartFree = (from: number, date: string, now: ZonedNow, bookings: readonly Booking[]) =>
  !isPastStart(from, date, now) &&
  from <= DAY_END - MIN_DURATION_MIN &&
  !overlapsAny(from, from + MIN_DURATION_MIN, bookings);

export const firstFreeStart = (date: string, now: ZonedNow, bookings: readonly Booking[]) => {
  if (!isWorkday(date)) return null;
  return START_TIMES.find((start) => isStartFree(toMinutes(start), date, now, bookings)) ?? null;
};

export const isDayOver = (now: ZonedNow) =>
  now.minutes > toMinutes(START_TIMES[START_TIMES.length - 1]);

export type DayNotice = 'pastDay' | 'weekend' | 'dayOver' | 'fullyBooked';

export const dayNotice = (
  status: DayStatus,
  now: ZonedNow,
  hasFreeStart: boolean,
): DayNotice | null => {
  if (status === 'past') return 'pastDay';
  if (status === 'weekend') return 'weekend';
  if (status === 'today' && isDayOver(now)) return 'dayOver';
  return hasFreeStart ? null : 'fullyBooked';
};

export type ScheduleCell = { start: string; freeStart: string | null; closed: boolean };

export const scheduleCells = (
  date: string,
  now: ZonedNow,
  bookings: readonly Booking[],
): ScheduleCell[] =>
  range(DAY_START, DAY_END - CELL_MIN, CELL_MIN).map((from) => {
    const candidates = range(from, from + CELL_MIN - SLOT_STEP_MIN, SLOT_STEP_MIN);
    const free = isWorkday(date)
      ? candidates.find((start) => isStartFree(start, date, now, bookings))
      : undefined;
    return {
      start: toTime(from),
      freeStart: free === undefined ? null : toTime(free),
      closed: !isWorkday(date) || isPastStart(from + CELL_MIN - SLOT_STEP_MIN, date, now),
    };
  });

export const blockPosition = (start: string, end: string) => ({
  top: `${((toMinutes(start) - DAY_START) / DAY_LENGTH) * 100}%`,
  height: `${((toMinutes(end) - toMinutes(start)) / DAY_LENGTH) * 100}%`,
});

export const nowLinePosition = (date: string, now: ZonedNow) =>
  date === now.date && now.minutes >= DAY_START && now.minutes <= DAY_END
    ? `${((now.minutes - DAY_START) / DAY_LENGTH) * 100}%`
    : null;

const ceilToStep = (minutes: number) => Math.ceil(minutes / SLOT_STEP_MIN) * SLOT_STEP_MIN;
const floorToStep = (minutes: number) => Math.floor(minutes / SLOT_STEP_MIN) * SLOT_STEP_MIN;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const pointerMinutes = (ratio: number) => DAY_START + clamp(ratio, 0, 1) * DAY_LENGTH;

export type DragRange = { start: string; end: string; isValid: boolean };

export const dragRange = (
  anchorAt: number,
  pointerAt: number,
  date: string,
  now: ZonedNow,
  bookings: readonly Booking[],
): DragRange | null => {
  const anchor = floorToStep(anchorAt);
  if (!isWorkday(date) || anchor >= DAY_END) return null;
  if (isPastStart(anchor, date, now) || overlapsAny(anchor, anchor + SLOT_STEP_MIN, bookings)) {
    return null;
  }
  const lower = Math.max(
    DAY_START,
    date === now.date ? ceilToStep(now.minutes) : DAY_START,
    ...bookings.map((b) => toMinutes(b.end)).filter((end) => end <= anchor),
  );
  const upper = Math.min(
    DAY_END,
    ...bookings.map((b) => toMinutes(b.start)).filter((start) => start > anchor),
  );
  const [from, to] =
    pointerAt >= anchor
      ? [
          anchor,
          clamp(
            ceilToStep(pointerAt),
            anchor + SLOT_STEP_MIN,
            Math.min(upper, anchor + MAX_DURATION_MIN),
          ),
        ]
      : [
          clamp(
            floorToStep(pointerAt),
            Math.max(lower, anchor + SLOT_STEP_MIN - MAX_DURATION_MIN),
            anchor,
          ),
          anchor + SLOT_STEP_MIN,
        ];
  return { start: toTime(from), end: toTime(to), isValid: to - from >= MIN_DURATION_MIN };
};

export type DaySummary = { count: number; freeMinutes: number };

export const daySummary = (
  date: string,
  now: ZonedNow,
  bookings: readonly Booking[],
): DaySummary => {
  const count = bookings.length;
  if (!isWorkday(date) || date < now.date) return { count, freeMinutes: 0 };
  const from = date === now.date ? Math.max(DAY_START, ceilToStep(now.minutes)) : DAY_START;
  const busy = [...bookings]
    .map((b) => [toMinutes(b.start), toMinutes(b.end)] as const)
    .sort((x, y) => x[0] - y[0]);
  let cursor = from;
  let freeMinutes = 0;
  for (const [start, end] of [...busy, [DAY_END, DAY_END] as const]) {
    const gap = start - cursor;
    if (gap >= MIN_DURATION_MIN) freeMinutes += gap;
    cursor = Math.max(cursor, end);
  }
  return { count, freeMinutes };
};

const TIMELINE_HEIGHT_PX = 576;
const BLOCK_CHROME_PX = 10;
const TEXT_LINE_PX = 16;

export const titleLines = (start: string, end: string) => {
  const heightPx = ((toMinutes(end) - toMinutes(start)) / DAY_LENGTH) * TIMELINE_HEIGHT_PX;
  return Math.floor((heightPx - BLOCK_CHROME_PX) / TEXT_LINE_PX) - 1;
};
