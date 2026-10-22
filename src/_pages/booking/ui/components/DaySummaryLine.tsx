import { ArrowRightIcon, CalendarCheckIcon, ClockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DaySummary } from '../../lib/schedule';

type Props = {
  summary: DaySummary;
  freeStart: string | null;
  onCreate: (start: string) => void;
};

const MINUTES_IN_HOUR = 60;

const ITEM_CLASS =
  'flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:text-sm [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground lg:[&_svg]:size-4';

export const DaySummaryLine = ({ summary, freeStart, onCreate }: Props) => {
  const t = useTranslations('booking.summary');
  const hours = Math.floor(summary.freeMinutes / MINUTES_IN_HOUR);
  const minutes = summary.freeMinutes % MINUTES_IN_HOUR;
  const durationKey = hours && minutes ? 'hm' : hours ? 'h' : 'm';

  return (
    <ul
      aria-label={t('label')}
      className="flex flex-wrap gap-2 lg:flex-col lg:gap-3 lg:rounded-lg lg:border lg:bg-card lg:p-4"
    >
      <li className={ITEM_CLASS}>
        <CalendarCheckIcon aria-hidden />
        {t('bookings', { count: summary.count })}
      </li>
      {summary.freeMinutes > 0 && (
        <li className={ITEM_CLASS}>
          <ClockIcon aria-hidden />
          {t('free', { duration: t(durationKey, { hours, minutes }) })}
        </li>
      )}
      {freeStart && (
        <li>
          <button
            type="button"
            onClick={() => onCreate(freeStart)}
            className="flex items-center gap-1.5 rounded-full border border-info-border bg-info-soft px-2.5 py-1 text-xs font-medium text-info-strong outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring lg:w-full lg:justify-between lg:rounded-md lg:px-3 lg:py-2 lg:text-sm"
          >
            {t('nearest', { time: freeStart })}
            <ArrowRightIcon aria-hidden className="size-3.5 lg:size-4" />
          </button>
        </li>
      )}
    </ul>
  );
};
