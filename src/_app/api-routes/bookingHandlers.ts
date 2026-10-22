import { createTranslator } from 'next-intl';
import { z } from 'zod';
import {
  bookingInputSchema,
  bookingPatchSchema,
  findRuleViolation,
  hasStarted,
  ruleMessage,
} from '@/entities/booking';
import type { Booking, BookingInput } from '@/entities/booking';
import { TIME_ZONE_HEADER } from '@/shared/config';
import type { Locale } from '@/shared/config';
import { isCalendarDate, zonedNow } from '@/shared/lib/time';
import { apiError, readJson, requestLocale, requestTimeZone, simulateLatency } from './apiResponse';
import { bookingStore, bookingsOn } from './bookingStore';
import en from './i18n/en.json';
import ru from './i18n/ru.json';

type IdContext = { params: Promise<{ id: string }> };
type Slot = Omit<Booking, 'id'>;

const MESSAGES = { ru, en } satisfies Record<Locale, typeof ru>;

const ZOD_LOCALES = { ru: z.locales.ru(), en: z.locales.en() } satisfies Record<Locale, unknown>;

const parseBody = <T extends z.ZodType>(schema: T, data: unknown, locale: Locale) =>
  schema.safeParse(data, { error: ZOD_LOCALES[locale].localeError });

const DEFAULT_CONFLICT_RATE = 0.2;
const PERCENT = 100;

const parseConflictRate = (value: string | undefined) => {
  const rate = Number(value?.replace(',', '.'));
  if (!value?.trim() || !Number.isFinite(rate) || rate < 0) return DEFAULT_CONFLICT_RATE;
  return rate > 1 ? Math.min(rate / PERCENT, 1) : rate;
};

const CONFLICT_RATE = parseConflictRate(process.env.MOCK_CONFLICT_RATE);

const serverT = (locale: Locale) => createTranslator({ locale, messages: MESSAGES[locale] });

const requestContext = (request: Request) => {
  const locale = requestLocale(request);
  return { locale, t: serverT(locale), timeZone: requestTimeZone(request) };
};

const invalidBody = (error: z.ZodError, locale: Locale) => {
  const issue = error.issues[0];
  const field = issue?.path.join('.') ?? '';
  const message = serverT(locale)('invalidBody', {
    hasField: field ? 'yes' : 'no',
    field,
    reason: issue?.message ?? '',
  });
  return apiError('BAD_REQUEST', message, field);
};

const normalize = (input: BookingInput): Slot => ({
  date: input.date,
  start: input.start,
  end: input.end,
  title: input.title || undefined,
});

const validate = (slot: Slot, timeZone: string, locale: Locale, ignoreId?: string) => {
  const violation = findRuleViolation(slot, {
    bookings: bookingsOn(slot.date),
    now: zonedNow(timeZone),
    ignoreId,
  });
  if (!violation) return null;
  return apiError(
    violation.code === 'CONFLICT' ? 'CONFLICT' : 'RULE_VIOLATION',
    ruleMessage(violation, locale),
    violation.field,
  );
};

const raceLost = (slot: Slot, locale: Locale) => {
  const t = serverT(locale);
  const rival: Booking = { ...slot, id: crypto.randomUUID(), title: t('rivalTitle') };
  bookingStore.bookings.set(rival.id, rival);
  return apiError('CONFLICT', t('raceLost', { time: `${slot.start}–${slot.end}` }), 'start');
};

export const listBookings = async (request: Request) => {
  await simulateLatency();
  const { t } = requestContext(request);
  const date = new URL(request.url).searchParams.get('date') ?? '';
  if (!isCalendarDate(date)) return apiError('BAD_REQUEST', t('badDate'), 'date');
  return Response.json(bookingsOn(date));
};

export const createBooking = async (request: Request) => {
  const { locale, t, timeZone } = requestContext(request);
  const parsed = parseBody(bookingInputSchema, await readJson(request), locale);
  await simulateLatency();
  if (!parsed.success) return invalidBody(parsed.error, locale);
  if (!timeZone) return apiError('BAD_REQUEST', t('badTimeZone', { header: TIME_ZONE_HEADER }));

  const slot = normalize(parsed.data);
  const failure = validate(slot, timeZone, locale);
  if (failure) return failure;
  if (Math.random() < CONFLICT_RATE) return raceLost(slot, locale);

  const booking: Booking = { ...slot, id: crypto.randomUUID() };
  bookingStore.bookings.set(booking.id, booking);
  return Response.json(booking, { status: 201 });
};

export const updateBooking = async (request: Request, { params }: IdContext) => {
  const { id } = await params;
  const { locale, t, timeZone } = requestContext(request);
  const parsed = parseBody(bookingPatchSchema, await readJson(request), locale);
  await simulateLatency();
  if (!parsed.success) return invalidBody(parsed.error, locale);
  if (!timeZone) return apiError('BAD_REQUEST', t('badTimeZone', { header: TIME_ZONE_HEADER }));

  const current = bookingStore.bookings.get(id);
  if (!current) return apiError('NOT_FOUND', t('notFound'));
  if (hasStarted(current, zonedNow(timeZone))) return apiError('RULE_VIOLATION', t('startedEdit'));

  const slot = normalize({ ...current, ...parsed.data });
  const failure = validate(slot, timeZone, locale, id);
  if (failure) return failure;

  const booking: Booking = { ...slot, id };
  bookingStore.bookings.set(id, booking);
  return Response.json(booking);
};

export const deleteBooking = async (request: Request, { params }: IdContext) => {
  const { id } = await params;
  const { t, timeZone } = requestContext(request);
  await simulateLatency();
  if (!timeZone) return apiError('BAD_REQUEST', t('badTimeZone', { header: TIME_ZONE_HEADER }));

  const current = bookingStore.bookings.get(id);
  if (!current) return apiError('NOT_FOUND', t('notFound'));
  if (hasStarted(current, zonedNow(timeZone))) {
    return apiError('RULE_VIOLATION', t('startedDelete'));
  }

  bookingStore.bookings.delete(id);
  return new Response(null, { status: 204 });
};
