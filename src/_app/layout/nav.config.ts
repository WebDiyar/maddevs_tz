import type { Locale } from '@/shared/config';

export const NAV_ITEMS = [
  { href: '/', key: 'schedule' },
  { href: '/about', key: 'about' },
] as const;

export const LOCALE_LABELS: Record<Locale, string> = { ru: 'RU', en: 'EN' };
