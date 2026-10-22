import { z } from 'zod';
import { BOOKING_TITLE_MAX, findRuleViolation, ruleMessage } from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import type { Locale } from '@/shared/config';
import { TIME_PATTERN, isCalendarDate } from '@/shared/lib/time';
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

export const bookingFormSchema = ({ text, locale, ...context }: BookingRulesContext) =>
  z
    .object({
      date: z.string().refine(isCalendarDate, text.pickDate),
      start: z.string().regex(TIME_PATTERN, text.pickStart),
      end: z.string().regex(TIME_PATTERN, text.pickEnd),
      title: z.string().trim().max(BOOKING_TITLE_MAX, text.titleTooLong),
    })
    .superRefine((values, ctx) => {
      const violation = findRuleViolation(values, context);
      if (violation) {
        ctx.addIssue({
          code: 'custom',
          path: [violation.field],
          message: ruleMessage(violation, locale),
        });
      }
    });
