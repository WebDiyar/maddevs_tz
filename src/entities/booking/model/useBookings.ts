'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBooking, deleteBooking, fetchBookings, updateBooking } from '../api/bookingApi';
import { bookingQueryKeys } from './bookingQueryKeys';

export const useBookingsQuery = (date: string | null) =>
  useQuery({
    queryKey: bookingQueryKeys.byDate(date ?? ''),
    queryFn: () => fetchBookings(date ?? ''),
    enabled: date !== null,
  });

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
