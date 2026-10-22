import type { Locale } from '@/shared/config';
import en from './en.json';
import ru from './ru.json';

export const notFoundMessages = { ru, en } satisfies Record<Locale, typeof ru>;
