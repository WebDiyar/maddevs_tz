'use client';

import { InfoIcon, PlusIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { apiErrorMessage } from '@/shared/lib/errors';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { QueryZone } from '@/shared/ui/QueryZone';
import { Spinner } from '@/shared/ui/spinner';
import { useBookingPageStore } from '../model/bookingPageStore';
import { useBookingDay } from '../model/useBookingDay';
import { BookingFormDialog } from './components/BookingFormDialog';
import { DateNav } from './components/DateNav';
import { DaySchedule } from './components/DaySchedule';
import { DayScheduleSkeleton } from './components/DayScheduleSkeleton';
import { DeleteBookingDialog } from './components/DeleteBookingDialog';

export const BookingPage = () => {
  const t = useTranslations('booking.page');
  const locale = useLocale();
  const { now, date, query, bookings, status, freeStart } = useBookingDay();
  const selectDate = useBookingPageStore((state) => state.selectDate);
  const openCreate = useBookingPageStore((state) => state.openCreate);
  const openEdit = useBookingPageStore((state) => state.openEdit);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>

      {!now || !date ? (
        <DayScheduleSkeleton />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DateNav date={date} today={now.date} onChange={selectDate} />
            <Button disabled={!freeStart} onClick={() => freeStart && openCreate(date, freeStart)}>
              <PlusIcon />
              {t('create')}
            </Button>
          </div>

          {status === 'past' && (
            <Alert>
              <InfoIcon />
              <AlertDescription>{t('pastDay')}</AlertDescription>
            </Alert>
          )}
          {status === 'weekend' && (
            <Alert>
              <InfoIcon />
              <AlertDescription>{t('weekend')}</AlertDescription>
            </Alert>
          )}
          {status === 'today' && query.isSuccess && !freeStart && (
            <Alert>
              <InfoIcon />
              <AlertDescription>{t('dayOver')}</AlertDescription>
            </Alert>
          )}

          <section aria-labelledby="schedule-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="schedule-title" className="text-lg font-medium">
                {t('schedule')}
              </h2>
              {query.isFetching && !query.isPending && (
                <span
                  role="status"
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Spinner />
                  {t('refreshing')}
                </span>
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
              {bookings.length === 0 && (
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
                onCreate={(start) => openCreate(date, start)}
                onEdit={openEdit}
              />
            </QueryZone>
          </section>

          <BookingFormDialog now={now} />
          <DeleteBookingDialog />
        </>
      )}
    </main>
  );
};
