import axios from 'axios';
import { createTranslator } from 'next-intl';
import { ZodError } from 'zod';
import { DEFAULT_LOCALE } from '@/shared/config';
import type { Locale } from '@/shared/config';
import { MESSAGES } from '@/shared/i18n';

const STATUS_KEYS = {
  400: 'status400',
  404: 'status404',
  409: 'status409',
  422: 'status422',
} as const;

const isKnownStatus = (status: number): status is keyof typeof STATUS_KEYS => status in STATUS_KEYS;

const serverMessage = (data: unknown) =>
  typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
    ? data.message
    : null;

export const apiErrorMessage = (error: unknown, locale: Locale = DEFAULT_LOCALE): string => {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'errors' });
  if (error instanceof ZodError) return t('badShape');
  if (axios.isAxiosError(error)) {
    if (!error.response) return t('offline');
    const { status, data } = error.response;
    return (
      serverMessage(data) ??
      (isKnownStatus(status) ? t(STATUS_KEYS[status]) : t('server', { status }))
    );
  }
  return error instanceof Error ? error.message : t('unknown');
};

export const hasStatus = (error: unknown, status: number) =>
  axios.isAxiosError(error) && error.response?.status === status;
