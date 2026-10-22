import type { Locale } from '@/shared/config';
import en from './messages/en.json';
import ru from './messages/ru.json';

export type Messages = typeof ru;

export const MESSAGES: Record<Locale, Messages> = { ru, en };
