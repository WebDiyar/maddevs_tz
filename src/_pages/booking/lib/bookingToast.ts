import type { Booking } from '@/entities/booking';
import type { Locale } from '@/shared/config';
import { formatLongDate } from './formatDate';

type Translate = (
  key: 'details' | 'was' | 'changed' | 'fieldDate' | 'fieldTime' | 'fieldTitle',
  values?: Record<string, string>,
) => string;

type Fields = Pick<Booking, 'date' | 'start' | 'end' | 'title'>;

/** «четверг, 22 октября 2026, 10:00–11:00 · «Созвон»» */
export const bookingDetails = (booking: Fields, locale: Locale, t: Translate) =>
  t('details', {
    date: formatLongDate(booking.date, locale),
    start: booking.start,
    end: booking.end,
    hasTitle: booking.title ? 'yes' : 'no',
    title: booking.title ?? '',
  });

/** Описание тоста после сохранения: что стало и что именно изменилось. */
export const bookingChangeDetails = (
  before: Fields,
  after: Fields,
  locale: Locale,
  t: Translate,
) => {
  const fields = [
    before.date !== after.date && t('fieldDate'),
    (before.start !== after.start || before.end !== after.end) && t('fieldTime'),
    (before.title ?? '') !== (after.title ?? '') && t('fieldTitle'),
  ].filter(Boolean);
  const lines = [bookingDetails(after, locale, t)];
  if (fields.length) {
    lines.push(t('changed', { fields: fields.join(', ') }));
    lines.push(t('was', { details: bookingDetails(before, locale, t) }));
  }
  return lines.join('\n');
};
