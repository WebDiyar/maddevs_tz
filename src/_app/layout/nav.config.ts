import { BookOpenIcon, CalendarDaysIcon } from 'lucide-react';
import type { Locale } from '@/shared/config';

export const NAV_ITEMS = [
  { href: '/', key: 'schedule', icon: CalendarDaysIcon },
  { href: '/about', key: 'about', icon: BookOpenIcon },
] as const;

export const LOCALE_LABELS: Record<Locale, string> = { ru: 'RU', en: 'EN' };

export const THEMES = ['system', 'light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];
