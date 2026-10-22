'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { shiftDate } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';
import { DatePicker } from './DatePicker';

type Props = {
  date: string;
  today: string;
  onChange: (date: string) => void;
};

export const DateNav = ({ date, today, onChange }: Props) => {
  const t = useTranslations('booking.nav');
  return (
    <nav aria-label={t('label')} className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label={t('prev')}
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <DatePicker value={date} onChange={onChange} className="flex-1 sm:w-72 sm:flex-none" />
      <Button
        variant="outline"
        size="icon"
        aria-label={t('next')}
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <ChevronRightIcon />
      </Button>
      <Button variant="ghost" disabled={date === today} onClick={() => onChange(today)}>
        {t('today')}
      </Button>
    </nav>
  );
};
