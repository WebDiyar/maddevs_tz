export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
export const HTTP_TIMEOUT_MS = 15_000;
export const QUERY_STALE_MS = 30_000;
export const TIME_ZONE_HEADER = 'X-Time-Zone';

export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ru';
