import { z } from 'zod';
import { http } from '@/shared/api';
import { TIME_PATTERN, isCalendarDate } from '@/shared/lib/time';

export const BOOKING_TITLE_MAX = 80;

const dateField = z.string().refine(isCalendarDate, 'YYYY-MM-DD');
const timeField = z.string().regex(TIME_PATTERN, 'HH:mm');

export const bookingSchema = z.object({
  id: z.string(),
  date: dateField,
  start: timeField,
  end: timeField,
  title: z.string().optional(),
});

export const bookingInputSchema = z.object({
  date: dateField,
  start: timeField,
  end: timeField,
  title: z.string().trim().max(BOOKING_TITLE_MAX).optional(),
});

export const bookingPatchSchema = bookingInputSchema.partial();

export type Booking = z.infer<typeof bookingSchema>;
export type BookingInput = z.infer<typeof bookingInputSchema>;
export type BookingPatch = z.infer<typeof bookingPatchSchema>;

const BOOKINGS = '/bookings';

export const fetchBookings = async (date: string) => {
  const { data } = await http.get(BOOKINGS, { params: { date } });
  return z.array(bookingSchema).parse(data);
};

export const createBooking = async (input: BookingInput) => {
  const { data } = await http.post(BOOKINGS, input);
  return bookingSchema.parse(data);
};

export const updateBooking = async ({ id, ...patch }: BookingPatch & { id: string }) => {
  const { data } = await http.patch(`${BOOKINGS}/${id}`, patch);
  return bookingSchema.parse(data);
};

export const deleteBooking = async (id: string) => {
  await http.delete(`${BOOKINGS}/${id}`);
};
