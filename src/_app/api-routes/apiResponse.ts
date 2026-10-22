import { TIME_ZONE_HEADER } from '@/shared/config';
import type { Locale } from '@/shared/config';
import { isValidTimeZone } from '@/shared/lib/time';

export type ApiErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' | 'RULE_VIOLATION';

const STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RULE_VIOLATION: 422,
};

export const apiError = (code: ApiErrorCode, message: string, field?: string) =>
  Response.json({ code, message, field }, { status: STATUS[code] });

const LATENCY_MS = Number(process.env.MOCK_LATENCY_MS ?? 400);

export const simulateLatency = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

const FALLBACK_TIME_ZONE = 'UTC';

export const requestTimeZone = (request: Request) => {
  const timeZone = request.headers.get(TIME_ZONE_HEADER) ?? FALLBACK_TIME_ZONE;
  return isValidTimeZone(timeZone) ? timeZone : null;
};

export const requestLocale = (request: Request): Locale =>
  request.headers.get('accept-language')?.toLowerCase().startsWith('en') ? 'en' : 'ru';
