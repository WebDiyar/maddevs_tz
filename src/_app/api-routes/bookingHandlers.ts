import type { z } from 'zod';
import {
  ROOM_TIME_ZONE,
  bookingInputSchema,
  bookingPatchSchema,
  findRuleViolation,
  hasStarted,
} from '@/entities/booking';
import type { Booking, BookingInput } from '@/entities/booking';
import { DATE_PATTERN, zonedNow } from '@/shared/lib/time';
import { apiError, readJson, simulateLatency } from './apiResponse';
import { bookingStore, bookingsOn } from './bookingStore';

type IdContext = { params: Promise<{ id: string }> };

const CONFLICT_RATE = Number(process.env.MOCK_CONFLICT_RATE ?? 0.2);

const invalidBody = (error: z.ZodError) => {
  const issue = error.issues[0];
  const field = issue?.path.join('.') ?? '';
  return apiError(
    'BAD_REQUEST',
    `Некорректные данные${field ? ` в поле ${field}` : ''}: ${issue?.message}`,
    field,
  );
};

const normalize = (input: BookingInput): Omit<Booking, 'id'> => ({
  date: input.date,
  start: input.start,
  end: input.end,
  title: input.title || undefined,
});

const validate = (slot: Omit<Booking, 'id'>, ignoreId?: string) => {
  const violation = findRuleViolation(slot, {
    bookings: bookingsOn(slot.date),
    now: zonedNow(ROOM_TIME_ZONE),
    ignoreId,
  });
  if (!violation) return null;
  return apiError(
    violation.code === 'CONFLICT' ? 'CONFLICT' : 'RULE_VIOLATION',
    violation.message,
    violation.field,
  );
};

const raceLost = (slot: Omit<Booking, 'id'>) => {
  const rival: Booking = { ...slot, id: crypto.randomUUID(), title: 'Занято коллегой' };
  bookingStore.bookings.set(rival.id, rival);
  return apiError(
    'CONFLICT',
    `Пока вы оформляли бронь, время ${slot.start}–${slot.end} занял другой пользователь`,
    'start',
  );
};

export const listBookings = async (request: Request) => {
  await simulateLatency();
  const date = new URL(request.url).searchParams.get('date') ?? '';
  if (!DATE_PATTERN.test(date)) {
    return apiError('BAD_REQUEST', 'Параметр date обязателен в формате YYYY-MM-DD', 'date');
  }
  return Response.json(bookingsOn(date));
};

export const createBooking = async (request: Request) => {
  const parsed = bookingInputSchema.safeParse(await readJson(request));
  await simulateLatency();
  if (!parsed.success) return invalidBody(parsed.error);

  const slot = normalize(parsed.data);
  const failure = validate(slot);
  if (failure) return failure;
  if (Math.random() < CONFLICT_RATE) return raceLost(slot);

  const booking: Booking = { ...slot, id: crypto.randomUUID() };
  bookingStore.bookings.set(booking.id, booking);
  return Response.json(booking, { status: 201 });
};

export const updateBooking = async (request: Request, { params }: IdContext) => {
  const { id } = await params;
  const parsed = bookingPatchSchema.safeParse(await readJson(request));
  await simulateLatency();
  if (!parsed.success) return invalidBody(parsed.error);

  const current = bookingStore.bookings.get(id);
  if (!current) return apiError('NOT_FOUND', 'Бронь не найдена — возможно, её уже удалили');
  if (hasStarted(current, zonedNow(ROOM_TIME_ZONE))) {
    return apiError('RULE_VIOLATION', 'Начавшуюся или прошедшую бронь изменить нельзя');
  }

  const slot = normalize({ ...current, ...parsed.data });
  const failure = validate(slot, id);
  if (failure) return failure;

  const booking: Booking = { ...slot, id };
  bookingStore.bookings.set(id, booking);
  return Response.json(booking);
};

export const deleteBooking = async (_request: Request, { params }: IdContext) => {
  const { id } = await params;
  await simulateLatency();

  const current = bookingStore.bookings.get(id);
  if (!current) return apiError('NOT_FOUND', 'Бронь не найдена — возможно, её уже удалили');
  if (hasStarted(current, zonedNow(ROOM_TIME_ZONE))) {
    return apiError('RULE_VIOLATION', 'Начавшуюся или прошедшую бронь удалить нельзя');
  }

  bookingStore.bookings.delete(id);
  return new Response(null, { status: 204 });
};
