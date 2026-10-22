'use client';

import { useBookingsQuery } from '@/entities/booking';
import { useZonedNow } from '@/shared/model';
import { dayStatus, firstFreeStart } from '../lib/schedule';
import { useBookingPageStore } from './bookingPageStore';

export const useBookingDay = () => {
  const now = useZonedNow();
  const selectedDate = useBookingPageStore((state) => state.selectedDate);
  const date = selectedDate ?? now?.date ?? null;
  const query = useBookingsQuery(date);
  const bookings = query.data ?? [];
  const status = date && now ? dayStatus(date, now) : null;
  const freeStart = date && now && query.isSuccess ? firstFreeStart(date, now, bookings) : null;

  return { now, date, query, bookings, status, freeStart };
};
