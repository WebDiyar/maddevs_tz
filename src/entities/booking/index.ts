export {
  BOOKING_TITLE_MAX,
  bookingInputSchema,
  bookingPatchSchema,
  bookingSchema,
} from './api/bookingApi';
export type { Booking, BookingInput, BookingPatch } from './api/bookingApi';
export {
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  SLOT_STEP_MIN,
  WORKDAY_END,
  WORKDAY_START,
  findRuleViolation,
  hasStarted,
  isWorkday,
} from './lib/bookingRules';
export type { BookingSlot, RuleViolation, RuleViolationCode } from './lib/bookingRules';
export { ruleMessage } from './lib/ruleMessage';
export { bookingQueryKeys } from './model/bookingQueryKeys';
export { bookingsQueryOptions } from './model/bookingsQueryOptions';
export {
  useBookingsQuery,
  usePrefetchBookingsQuery,
  useCreateBookingMutation,
  useDeleteBookingMutation,
  useUpdateBookingMutation,
} from './model/useBookings';
