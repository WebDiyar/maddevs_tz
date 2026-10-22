import type { Locale } from '@/shared/config';
import type { Messages } from './index';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
