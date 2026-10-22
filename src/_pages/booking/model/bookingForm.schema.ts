import { z } from 'zod';
import { BOOKING_TITLE_MAX, findRuleViolation } from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import { TIME_PATTERN } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';

export const bookingFormSchema = z.object({
  start: z.string().regex(TIME_PATTERN, 'Выберите время начала'),
  end: z.string().regex(TIME_PATTERN, 'Выберите время окончания'),
  title: z.string().trim().max(BOOKING_TITLE_MAX, `Не длиннее ${BOOKING_TITLE_MAX} символов`),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

export type BookingRulesContext = {
  date: string;
  now: ZonedNow;
  bookings: readonly Booking[];
  ignoreId?: string;
};

export const withBookingRules = ({ date, ...context }: BookingRulesContext) =>
  bookingFormSchema.superRefine((values, ctx) => {
    const violation = findRuleViolation({ date, start: values.start, end: values.end }, context);
    if (violation)
      ctx.addIssue({ code: 'custom', path: [violation.field], message: violation.message });
  });
