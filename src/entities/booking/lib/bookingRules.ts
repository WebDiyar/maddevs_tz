import { toMinutes, toTime, weekday } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';

export const WORKDAY_START = '09:00';
export const WORKDAY_END = '18:00';
export const MIN_DURATION_MIN = 30;
export const MAX_DURATION_MIN = 120;
export const SLOT_STEP_MIN = 15;

const WEEKEND_DAYS = new Set([0, 6]);

export type TimeRange = { start: string; end: string };
export type BookingSlot = TimeRange & { date: string };
export type ExistingBooking = BookingSlot & { id: string; title?: string };

export type RuleViolationCode =
  | 'PAST_DATE'
  | 'WEEKEND'
  | 'PAST_TIME'
  | 'START_OUTSIDE_WORKDAY'
  | 'END_OUTSIDE_WORKDAY'
  | 'START_NOT_BEFORE_END'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'CONFLICT';

export type RuleViolation = {
  code: RuleViolationCode;
  field: 'date' | 'start' | 'end';
  params?: Record<string, string | number>;
};

type RuleContext = {
  bookings: readonly ExistingBooking[];
  now: ZonedNow;
  ignoreId?: string;
};

export const isWorkday = (date: string) => !WEEKEND_DAYS.has(weekday(date));

export const overlaps = (a: TimeRange, b: TimeRange) =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);

export const hasStarted = (slot: BookingSlot, now: ZonedNow) =>
  slot.date < now.date || (slot.date === now.date && toMinutes(slot.start) < now.minutes);

export const findConflict = (slot: BookingSlot, { bookings, ignoreId }: RuleContext) =>
  bookings.find(
    (booking) => booking.id !== ignoreId && booking.date === slot.date && overlaps(booking, slot),
  );

export const findRuleViolation = (
  slot: BookingSlot,
  context: RuleContext,
): RuleViolation | null => {
  const start = toMinutes(slot.start);
  const end = toMinutes(slot.end);
  const { now } = context;

  if (slot.date < now.date) return { code: 'PAST_DATE', field: 'date' };
  if (!isWorkday(slot.date)) return { code: 'WEEKEND', field: 'date' };
  if (start < toMinutes(WORKDAY_START) || start >= toMinutes(WORKDAY_END)) {
    return {
      code: 'START_OUTSIDE_WORKDAY',
      field: 'start',
      params: { from: WORKDAY_START, to: WORKDAY_END },
    };
  }
  if (end > toMinutes(WORKDAY_END)) {
    return { code: 'END_OUTSIDE_WORKDAY', field: 'end', params: { to: WORKDAY_END } };
  }
  if (start >= end) return { code: 'START_NOT_BEFORE_END', field: 'end' };
  if (end - start < MIN_DURATION_MIN) {
    return { code: 'TOO_SHORT', field: 'end', params: { minutes: MIN_DURATION_MIN } };
  }
  if (end - start > MAX_DURATION_MIN) {
    return { code: 'TOO_LONG', field: 'end', params: { hours: MAX_DURATION_MIN / 60 } };
  }
  if (slot.date === now.date && start < now.minutes) {
    return { code: 'PAST_TIME', field: 'start', params: { now: toTime(now.minutes) } };
  }
  const conflict = findConflict(slot, context);
  if (conflict) {
    return {
      code: 'CONFLICT',
      field: 'start',
      params: {
        time: `${conflict.start}–${conflict.end}`,
        hasTitle: conflict.title ? 'yes' : 'no',
        title: conflict.title ?? '',
      },
    };
  }
  return null;
};
