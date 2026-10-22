'use client';

import { ROOM_TIME_ZONE, useBookingsQuery } from '@/entities/booking';
import { useZonedNow } from '@/shared/model';
import { dayStatus, firstFreeStart } from '../lib/schedule';
import { useBookingPageStore } from './bookingPageStore';

export const useBookingDay = () => {
  const now = useZonedNow(ROOM_TIME_ZONE);
  const selectedDate = useBookingPageStore((state) => state.selectedDate);
  const date = selectedDate ?? now?.date ?? null;
  const query = useBookingsQuery(date);
  const bookings = query.data ?? [];
  const status = date && now ? dayStatus(date, now) : null;
  const freeStart = date && now ? firstFreeStart(date, now, bookings) : null;

  return { now, date, query, bookings, status, canCreate: freeStart !== null && query.isSuccess };
};
