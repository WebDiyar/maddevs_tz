import { toMinutes, toTime, weekday } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';
import { DEFAULT_LOCALE } from '@/shared/config';
import type { Locale } from '@/shared/config';
import { MESSAGES } from '@/shared/i18n';
import { createTranslator } from 'next-intl';

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
  | 'OUTSIDE_WORKDAY'
  | 'START_NOT_BEFORE_END'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'CONFLICT';

export type RuleViolation = {
  code: RuleViolationCode;
  field: 'date' | 'start' | 'end';
  message: string;
};

type RuleContext = {
  bookings: readonly ExistingBooking[];
  now: ZonedNow;
  ignoreId?: string;
  locale?: Locale;
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
  const { now, locale = DEFAULT_LOCALE } = context;
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'rules' });
  const violation = (code: RuleViolationCode, field: RuleViolation['field'], message: string) => ({
    code,
    field,
    message,
  });

  if (slot.date < now.date) return violation('PAST_DATE', 'date', t('pastDate'));
  if (!isWorkday(slot.date)) return violation('WEEKEND', 'date', t('weekend'));
  if (start < toMinutes(WORKDAY_START) || start >= toMinutes(WORKDAY_END)) {
    return violation(
      'OUTSIDE_WORKDAY',
      'start',
      t('startOutside', { from: WORKDAY_START, to: WORKDAY_END }),
    );
  }
  if (end > toMinutes(WORKDAY_END)) {
    return violation('OUTSIDE_WORKDAY', 'end', t('endOutside', { to: WORKDAY_END }));
  }
  if (start >= end) return violation('START_NOT_BEFORE_END', 'end', t('startNotBeforeEnd'));
  if (end - start < MIN_DURATION_MIN) {
    return violation('TOO_SHORT', 'end', t('tooShort', { minutes: MIN_DURATION_MIN }));
  }
  if (end - start > MAX_DURATION_MIN) {
    return violation('TOO_LONG', 'end', t('tooLong', { hours: MAX_DURATION_MIN / 60 }));
  }
  if (slot.date === now.date && start < now.minutes) {
    return violation('PAST_TIME', 'start', t('pastTime', { now: toTime(now.minutes) }));
  }
  const conflict = findConflict(slot, context);
  if (conflict) {
    return violation(
      'CONFLICT',
      'start',
      t('conflict', {
        time: `${conflict.start}–${conflict.end}`,
        hasTitle: conflict.title ? 'yes' : 'no',
        title: conflict.title ?? '',
      }),
    );
  }
  return null;
};
