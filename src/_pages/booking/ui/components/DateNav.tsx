'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { shiftDate } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';
import { formatLongDate } from '../../lib/formatDate';
import { DatePicker } from './DatePicker';

type Props = {
  date: string;
  today: string;
  onChange: (date: string) => void;
};

export const DateNav = ({ date, today, onChange }: Props) => {
  const t = useTranslations('booking.nav');
  const locale = useLocale();
  return (
    <nav aria-label={t('label')} className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label={t('prev')}
        aria-keyshortcuts="ArrowLeft"
        title={t('prevHint')}
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <DatePicker
        value={date}
        onChange={onChange}
        className="flex-1 sm:w-72 sm:flex-none lg:hidden"
      />
      <p
        aria-live="polite"
        className="hidden min-w-0 px-1 text-xl font-semibold tracking-tight first-letter:uppercase lg:order-first lg:mr-auto lg:block"
      >
        {formatLongDate(date, locale)}
      </p>
      <Button
        variant="outline"
        size="icon"
        aria-label={t('next')}
        aria-keyshortcuts="ArrowRight"
        title={t('nextHint')}
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <ChevronRightIcon />
      </Button>
      <Button
        variant="ghost"
        className="max-[380px]:px-2"
        disabled={date === today}
        aria-keyshortcuts="T"
        title={t('todayHint')}
        onClick={() => onChange(today)}
      >
        {t('today')}
      </Button>
    </nav>
  );
};
