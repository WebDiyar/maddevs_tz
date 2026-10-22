import { queryOptions } from '@tanstack/react-query';
import { fetchBookings } from '../api/bookingApi';
import { bookingQueryKeys } from './bookingQueryKeys';

export const bookingsQueryOptions = (date: string) =>
  queryOptions({ queryKey: bookingQueryKeys.byDate(date), queryFn: () => fetchBookings(date) });
