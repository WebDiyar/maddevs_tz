import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import type { Locale } from '@/shared/config';

export const DATE_LOCALES = { ru, en: enUS } as const;

export const formatLongDate = (date: string, locale: Locale) =>
  format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: DATE_LOCALES[locale] });

export const formatShortDate = (date: string, locale: Locale) =>
  format(parseISO(date), 'EEEEEE, d MMM', { locale: DATE_LOCALES[locale] });

export const toDate = (date: string) => parseISO(date);

export const fromDate = (date: Date) => format(date, 'yyyy-MM-dd');
