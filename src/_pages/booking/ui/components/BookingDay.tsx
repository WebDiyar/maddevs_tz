'use client';

import { InfoIcon, PlusIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { apiErrorMessage } from '@/shared/lib/errors';
import { shiftDate } from '@/shared/lib/time';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { QueryZone } from '@/shared/ui/QueryZone';
import { Spinner } from '@/shared/ui/spinner';
import { defaultEnd } from '../../lib/schedule';
import { useBookingPageStore } from '../../model/bookingPageStore';
import { useBookingDay } from '../../model/useBookingDay';
import { useBookingHotkeys } from '../../model/useBookingHotkeys';
import { BookingFormDialog } from './BookingFormDialog';
import { DateNav } from './DateNav';
import { DaySchedule } from './DaySchedule';
import { DayScheduleSkeleton } from './DayScheduleSkeleton';
import { DaySummaryLine } from './DaySummaryLine';
import { DeleteBookingDialog } from './DeleteBookingDialog';

export const BookingDay = () => {
  const t = useTranslations('booking.page');
  const locale = useLocale();
  const { now, date, selectDate, query, isStale, bookings, freeStart, notice, summary } =
    useBookingDay();
  const openCreate = useBookingPageStore((state) => state.openCreate);
  const openEdit = useBookingPageStore((state) => state.openEdit);

  const create = (start: string, end?: string) => {
    if (date) openCreate(date, start, end ?? defaultEnd(start, bookings));
  };

  useBookingHotkeys({
    prev: () => date && selectDate(shiftDate(date, -1)),
    next: () => date && selectDate(shiftDate(date, 1)),
    today: () => now && selectDate(now.date),
    create: () => freeStart && create(freeStart),
  });

  if (!now || !date) return <DayScheduleSkeleton />;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DateNav date={date} today={now.date} onChange={selectDate} />
        <Button
          disabled={!freeStart}
          aria-keyshortcuts="N"
          title={t('createHint')}
          onClick={() => freeStart && create(freeStart)}
        >
          <PlusIcon />
          {t('create')}
        </Button>
      </div>

      {notice && (
        <Alert>
          <InfoIcon />
          <AlertDescription>{t(notice)}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="schedule-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 id="schedule-title" className="text-lg font-medium">
            {t('schedule')}
          </h2>
          {query.isFetching && !query.isPending ? (
            <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner />
              {t('refreshing')}
            </span>
          ) : (
            summary && <DaySummaryLine summary={summary} freeStart={freeStart} onCreate={create} />
          )}
        </div>
        <QueryZone
          status={query.status}
          error={query.error ? apiErrorMessage(query.error, locale) : undefined}
          errorTitle={t('loadError')}
          retryLabel={t('retry')}
          onRetry={() => void query.refetch()}
          skeleton={<DayScheduleSkeleton />}
        >
          {bookings.length === 0 && !isStale && (
            <p
              role="status"
              className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
            >
              <span className="font-medium text-foreground">{t('emptyTitle')}.</span>{' '}
              {freeStart ? t('emptyDescription') : null}
            </p>
          )}
          <DaySchedule
            date={date}
            now={now}
            bookings={bookings}
            isStale={isStale}
            onCreate={create}
            onEdit={openEdit}
          />
        </QueryZone>
      </section>

      <BookingFormDialog now={now} />
      <DeleteBookingDialog />
    </>
  );
};
