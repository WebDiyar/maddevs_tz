import { aboutMessages } from '@/_pages/about';
import { bookingMessages } from '@/_pages/booking';
import { notFoundMessages } from '@/_pages/not-found';
import type { Locale } from '@/shared/config';
import en from './en.json';
import ru from './ru.json';

export const MESSAGES = {
  ru: {
    ...ru,
    booking: bookingMessages.ru,
    about: aboutMessages.ru,
    notFound: notFoundMessages.ru,
  },
  en: {
    ...en,
    booking: bookingMessages.en,
    about: aboutMessages.en,
    notFound: notFoundMessages.en,
  },
} satisfies Record<Locale, unknown>;

export type Messages = (typeof MESSAGES)['ru'];
