import { z } from 'zod';
import { BOOKING_TITLE_MAX, findRuleViolation } from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import type { Locale } from '@/shared/config';
import { DATE_PATTERN, TIME_PATTERN } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';

export type BookingFormValues = {
  date: string;
  start: string;
  end: string;
  title: string;
};

export type BookingRulesContext = {
  now: ZonedNow;
  bookings: readonly Booking[];
  ignoreId?: string;
  locale: Locale;
  text: { pickDate: string; pickStart: string; pickEnd: string; titleTooLong: string };
};

export const bookingFormSchema = ({ text, ...context }: BookingRulesContext) =>
  z
    .object({
      date: z.string().regex(DATE_PATTERN, text.pickDate),
      start: z.string().regex(TIME_PATTERN, text.pickStart),
      end: z.string().regex(TIME_PATTERN, text.pickEnd),
      title: z.string().trim().max(BOOKING_TITLE_MAX, text.titleTooLong),
    })
    .superRefine((values, ctx) => {
      const violation = findRuleViolation(values, context);
      if (violation) {
        ctx.addIssue({ code: 'custom', path: [violation.field], message: violation.message });
      }
    });
