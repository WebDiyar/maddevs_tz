import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatLongDate = (date: string) =>
  format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: ru });

export const toDate = (date: string) => parseISO(date);

export const fromDate = (date: Date) => format(date, 'yyyy-MM-dd');

export const formatShortDate = (date: string) =>
  format(parseISO(date), 'EEEEEE, d MMM', { locale: ru });
