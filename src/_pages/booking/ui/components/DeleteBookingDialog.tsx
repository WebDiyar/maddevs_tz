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
          <AlertDialogDescription className="first-letter:uppercase">
            {deleting &&
              `${formatLongDate(deleting.date, locale)}, ${deleting.start}–${deleting.end}${deleting.title ? ` · ${deleting.title}` : ''}`}
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
