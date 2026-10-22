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
import { DayCalendar } from './DayCalendar';
import { HotkeysHint } from './HotkeysHint';
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
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="contents lg:sticky lg:top-20 lg:flex lg:flex-col lg:gap-4">
        <div className="hidden lg:block">
          <DayCalendar date={date} today={now.date} onChange={selectDate} />
        </div>
        <Button
          size="lg"
          disabled={!freeStart}
          aria-keyshortcuts="N"
          title={t('createHint')}
          className="order-2 w-full sm:col-start-2 sm:row-start-1 sm:w-auto lg:order-0 lg:w-full"
          onClick={() => freeStart && create(freeStart)}
        >
          <PlusIcon />
          {t('create')}
        </Button>
        {notice && (
          <Alert className="order-3 sm:col-span-2 lg:order-0">
            <InfoIcon />
            <AlertDescription>{t(notice)}</AlertDescription>
          </Alert>
        )}
        {summary && (
          <div className="order-4 sm:col-span-2 lg:order-0">
            <DaySummaryLine summary={summary} freeStart={freeStart} onCreate={create} />
          </div>
        )}
        <HotkeysHint />
      </div>

      <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
        <div className="order-1 sm:col-start-1 sm:row-start-1 lg:order-0">
          <DateNav date={date} today={now.date} onChange={selectDate} />
        </div>
        <section
          aria-labelledby="schedule-title"
          className="order-5 flex flex-col gap-3 sm:col-span-2 lg:order-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 id="schedule-title" className="text-lg font-medium lg:sr-only">
              {t('schedule')}
            </h2>
            {query.isError && query.data ? (
              <span role="alert" className="flex items-center gap-2 text-xs text-danger-strong">
                {t('refreshFailed')}
                <Button
                  variant="link"
                  size="xs"
                  className="h-auto p-0"
                  onClick={() => void query.refetch()}
                >
                  {t('retry')}
                </Button>
              </span>
            ) : query.isFetching && !query.isPending ? (
              <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner />
                {t('refreshing')}
              </span>
            ) : null}
          </div>
          <QueryZone
            status={query.data ? 'success' : query.status}
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
      </div>

      <BookingFormDialog now={now} />
      <DeleteBookingDialog />
    </div>
  );
};
