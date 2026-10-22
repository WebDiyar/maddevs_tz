'use client';

import { useTranslations } from 'next-intl';
import { LOCALES } from '@/shared/config';
import { useLocaleStore } from '@/shared/model';
import { Button } from '@/shared/ui/button';
import { LOCALE_LABELS } from './nav.config';

export const LocaleSwitch = () => {
  const t = useTranslations('header');
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <div role="group" aria-label={t('language')} className="flex rounded-md border p-0.5">
      {LOCALES.map((code) => (
        <Button
          key={code}
          size="sm"
          variant={code === locale ? 'secondary' : 'ghost'}
          aria-pressed={code === locale}
          className="h-7 px-2 font-mono text-xs"
          onClick={() => setLocale(code)}
        >
          {LOCALE_LABELS[code]}
        </Button>
      ))}
    </div>
  );
};
