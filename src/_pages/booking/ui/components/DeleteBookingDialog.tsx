'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Spinner } from '@/shared/ui/spinner';
import { formatLongDate } from '../../lib/formatDate';
import { useDeleteBooking } from '../../model/useDeleteBooking';

export const DeleteBookingDialog = () => {
  const t = useTranslations('booking.remove');
  const locale = useLocale();
  const { deleting, isPending, confirm, cancel } = useDeleteBooking();

  return (
    <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && !isPending && cancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-1">
              {deleting && (
                <>
                  <span className="first-letter:uppercase">
                    {formatLongDate(deleting.date, locale)}, {deleting.start}–{deleting.end}
                  </span>
                  {deleting.title && (
                    <span className="font-medium wrap-anywhere text-foreground">
                      {deleting.title}
                    </span>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            {isPending && <Spinner />}
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
