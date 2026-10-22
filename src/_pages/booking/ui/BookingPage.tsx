'use client';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { BookingDay } from './components/BookingDay';
import { DayScheduleSkeleton } from './components/DayScheduleSkeleton';

export const BookingPage = () => {
  const t = useTranslations('booking.page');

  return (
    <main className="mx-auto flex w-full max-w-page 2xl:max-w-page-wide flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8">
      <title>{t('metaTitle')}</title>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <Suspense fallback={<DayScheduleSkeleton />}>
        <BookingDay />
      </Suspense>
    </main>
  );
};
