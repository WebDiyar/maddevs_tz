'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useDeleteBookingMutation } from '@/entities/booking';
import { apiErrorMessage, isNotFound } from '@/shared/lib/errors';
import { bookingDetails } from '../lib/bookingToast';
import { useBookingPageStore } from './bookingPageStore';

export const useDeleteBooking = () => {
  const t = useTranslations('booking.remove');
  const tt = useTranslations('booking.toast');
  const locale = useLocale();
  const deleting = useBookingPageStore((state) => state.deleting);
  const closeDelete = useBookingPageStore((state) => state.closeDelete);
  const closeEditor = useBookingPageStore((state) => state.closeEditor);
  const mutation = useDeleteBookingMutation();

  const confirm = async () => {
    if (!deleting) return;
    try {
      await mutation.mutateAsync(deleting.id);
      toast.error(tt('deleted'), { description: bookingDetails(deleting, locale, tt) });
    } catch (error) {
      if (!isNotFound(error)) {
        toast.error(apiErrorMessage(error, locale));
        return;
      }
      toast.info(t('alreadyGone'));
    }
    closeDelete();
    closeEditor();
  };

  return { deleting, isPending: mutation.isPending, confirm, cancel: closeDelete };
};
