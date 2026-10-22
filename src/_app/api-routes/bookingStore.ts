import { isWorkday } from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import { shiftDate, zonedNow } from '@/shared/lib/time';

type Store = { bookings: Map<string, Booking> };

const nextWorkday = (date: string): string =>
  isWorkday(date) ? date : nextWorkday(shiftDate(date, 1));

const seed = (): Store => {
  const today = nextWorkday(zonedNow().date);
  const tomorrow = nextWorkday(shiftDate(today, 1));
  const bookings: Booking[] = [
    { id: crypto.randomUUID(), date: today, start: '10:00', end: '11:00', title: 'Планёрка' },
    {
      id: crypto.randomUUID(),
      date: today,
      start: '14:00',
      end: '15:30',
      title: 'Созвон с клиентом',
    },
    { id: crypto.randomUUID(), date: tomorrow, start: '11:00', end: '12:00', title: 'Ретро' },
  ];
  return { bookings: new Map(bookings.map((booking) => [booking.id, booking])) };
};

const globalStore = globalThis as typeof globalThis & { __bookingStore?: Store };

export const bookingStore = (globalStore.__bookingStore ??= seed());

export const bookingsOn = (date: string) =>
  [...bookingStore.bookings.values()]
    .filter((booking) => booking.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
