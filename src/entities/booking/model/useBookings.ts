'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBooking, deleteBooking, updateBooking } from '../api/bookingApi';
import { bookingsQueryOptions } from './bookingsQueryOptions';
import { bookingQueryKeys } from './bookingQueryKeys';

export const useBookingsQuery = (date: string | null) =>
  useQuery({
    ...bookingsQueryOptions(date ?? ''),
    enabled: date !== null,
    placeholderData: keepPreviousData,
  });

export const usePrefetchBookingsQuery = () => {
  const queryClient = useQueryClient();
  return (date: string) => queryClient.prefetchQuery(bookingsQueryOptions(date));
};

const useRefreshOnSettled = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: bookingQueryKeys.all });
};

export const useCreateBookingMutation = () =>
  useMutation({ mutationFn: createBooking, onSettled: useRefreshOnSettled() });

export const useUpdateBookingMutation = () =>
  useMutation({ mutationFn: updateBooking, onSettled: useRefreshOnSettled() });

export const useDeleteBookingMutation = () =>
  useMutation({ mutationFn: deleteBooking, onSettled: useRefreshOnSettled() });
