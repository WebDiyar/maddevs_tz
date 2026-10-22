'use client';

import { useLocale } from 'next-intl';
import { getDefaultClassNames } from 'react-day-picker';
import { Calendar } from '@/shared/ui/calendar';
import { DATE_LOCALES, fromDate, toDate } from '../../lib/formatDate';
import { WEEKEND_MATCHER } from '../../lib/schedule';

type Props = {
  date: string;
  today: string;
  onChange: (date: string) => void;
};

export const DayCalendar = ({ date, today, onChange }: Props) => {
  const locale = useLocale();

  return (
    <Calendar
      mode="single"
      required
      locale={DATE_LOCALES[locale]}
      selected={toDate(date)}
      month={toDate(date)}
      onMonthChange={(month) => onChange(fromDate(month))}
      onSelect={(day) => onChange(fromDate(day))}
      today={toDate(today)}
      modifiers={{ weekend: WEEKEND_MATCHER }}
      modifiersClassNames={{ weekend: 'text-muted-foreground' }}
      classNames={{ root: `w-full ${getDefaultClassNames().root}` }}
      className="rounded-lg border bg-card p-3 [--cell-size:--spacing(9)]"
    />
  );
};
