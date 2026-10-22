import { useTranslations } from 'next-intl';
import type { DaySummary } from '../../lib/schedule';

type Props = {
  summary: DaySummary;
  freeStart: string | null;
  onCreate: (start: string) => void;
};

const MINUTES_IN_HOUR = 60;

export const DaySummaryLine = ({ summary, freeStart, onCreate }: Props) => {
  const t = useTranslations('booking.summary');
  const hours = Math.floor(summary.freeMinutes / MINUTES_IN_HOUR);
  const minutes = summary.freeMinutes % MINUTES_IN_HOUR;
  const durationKey = hours && minutes ? 'hm' : hours ? 'h' : 'm';

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      <span>{t('bookings', { count: summary.count })}</span>
      {summary.freeMinutes > 0 && (
        <>
          <span aria-hidden>·</span>
          <span>{t('free', { duration: t(durationKey, { hours, minutes }) })}</span>
        </>
      )}
      {freeStart && (
        <>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={() => onCreate(freeStart)}
            className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-info-strong focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('nearest', { time: freeStart })}
          </button>
        </>
      )}
    </p>
  );
};
