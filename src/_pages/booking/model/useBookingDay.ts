'use client';

import { useEffect } from 'react';
import { usePrefetchBookingsQuery, useBookingsQuery } from '@/entities/booking';
import { shiftDate } from '@/shared/lib/time';
import { useZonedNow } from '@/shared/model';
import { dayNotice, daySummary, dayStatus, firstFreeStart } from '../lib/schedule';
import { useSelectedDate } from './useSelectedDate';

const PREFETCH_DAYS = [-1, 1];

export const useBookingDay = () => {
  const now = useZonedNow();
  const { date: selectedDate, selectDate } = useSelectedDate();
  const date = selectedDate ?? now?.date ?? null;
  const query = useBookingsQuery(date);
  const isStale = query.isPlaceholderData;
  const isReady = query.isSuccess && !isStale;
  const bookings = query.data ?? [];
  const status = date && now ? dayStatus(date, now) : null;
  const freeStart = date && now && isReady ? firstFreeStart(date, now, bookings) : null;
  const notice = status && now ? dayNotice(status, now, !isReady || freeStart !== null) : null;
  const summary = date && now && isReady ? daySummary(date, now, bookings) : null;

  const prefetch = usePrefetchBookingsQuery();
  useEffect(() => {
    if (!date || !isReady) return;
    PREFETCH_DAYS.forEach((days) => void prefetch(shiftDate(date, days)));
  }, [date, isReady, prefetch]);

  return { now, date, selectDate, query, isStale, bookings, freeStart, notice, summary };
};
