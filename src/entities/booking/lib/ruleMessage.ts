import { createTranslator } from 'next-intl';
import type { Locale } from '@/shared/config';
import en from '../i18n/en.json';
import ru from '../i18n/ru.json';
import type { RuleViolation } from './bookingRules';

const MESSAGES = { ru, en } satisfies Record<Locale, typeof ru>;

export const ruleMessage = ({ code, params }: RuleViolation, locale: Locale) =>
  createTranslator({ locale, messages: MESSAGES[locale] })(code, params);
