import { toMinutes, toTime } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';

export const ROOM_TIME_ZONE = 'Asia/Bishkek';
export const WORKDAY_START = '09:00';
export const WORKDAY_END = '18:00';
export const MIN_DURATION_MIN = 30;
export const MAX_DURATION_MIN = 120;
export const SLOT_STEP_MIN = 15;

export type TimeRange = { start: string; end: string };
export type BookingSlot = TimeRange & { date: string };
export type ExistingBooking = BookingSlot & { id: string; title?: string };

export type RuleViolationCode =
  | 'PAST_DATE'
  | 'PAST_TIME'
  | 'OUTSIDE_WORKDAY'
  | 'START_NOT_BEFORE_END'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'CONFLICT';

export type RuleViolation = {
  code: RuleViolationCode;
  field: 'start' | 'end';
  message: string;
};

type RuleContext = {
  bookings: readonly ExistingBooking[];
  now: ZonedNow;
  ignoreId?: string;
};

export const overlaps = (a: TimeRange, b: TimeRange) =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);

export const hasStarted = (slot: BookingSlot, now: ZonedNow) =>
  slot.date < now.date || (slot.date === now.date && toMinutes(slot.start) < now.minutes);

export const findConflict = (slot: BookingSlot, { bookings, ignoreId }: RuleContext) =>
  bookings.find(
    (booking) => booking.id !== ignoreId && booking.date === slot.date && overlaps(booking, slot),
  );

const describeBooking = (booking: ExistingBooking) =>
  `${booking.start}–${booking.end}${booking.title ? ` «${booking.title}»` : ''}`;

export const findRuleViolation = (
  slot: BookingSlot,
  context: RuleContext,
): RuleViolation | null => {
  const start = toMinutes(slot.start);
  const end = toMinutes(slot.end);
  const { now } = context;

  if (slot.date < now.date) {
    return { code: 'PAST_DATE', field: 'start', message: 'Нельзя бронировать прошедшую дату' };
  }
  if (start < toMinutes(WORKDAY_START) || start >= toMinutes(WORKDAY_END)) {
    return {
      code: 'OUTSIDE_WORKDAY',
      field: 'start',
      message: `Начало — в рабочее время ${WORKDAY_START}–${WORKDAY_END}`,
    };
  }
  if (end > toMinutes(WORKDAY_END)) {
    return {
      code: 'OUTSIDE_WORKDAY',
      field: 'end',
      message: `Окончание — не позже ${WORKDAY_END}`,
    };
  }
  if (start >= end) {
    return {
      code: 'START_NOT_BEFORE_END',
      field: 'end',
      message: 'Окончание должно быть позже начала',
    };
  }
  if (end - start < MIN_DURATION_MIN) {
    return {
      code: 'TOO_SHORT',
      field: 'end',
      message: `Минимальная длительность — ${MIN_DURATION_MIN} минут`,
    };
  }
  if (end - start > MAX_DURATION_MIN) {
    return {
      code: 'TOO_LONG',
      field: 'end',
      message: `Максимальная длительность — ${MAX_DURATION_MIN / 60} часа`,
    };
  }
  if (slot.date === now.date && start < now.minutes) {
    return {
      code: 'PAST_TIME',
      field: 'start',
      message: `Время начала уже прошло — сейчас ${toTime(now.minutes)}`,
    };
  }
  const conflict = findConflict(slot, context);
  if (conflict) {
    return {
      code: 'CONFLICT',
      field: 'start',
      message: `Пересекается с бронью ${describeBooking(conflict)}`,
    };
  }
  return null;
};
