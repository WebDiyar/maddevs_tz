'use client';

import { toast } from 'sonner';
import { useDeleteBookingMutation } from '@/entities/booking';
import { apiErrorMessage, hasStatus } from '@/shared/lib/errors';
import { DELETE_TEXT } from './bookingPage.data';
import { useBookingPageStore } from './bookingPageStore';

const STATUS_NOT_FOUND = 404;

export const useDeleteBooking = () => {
  const deleting = useBookingPageStore((state) => state.deleting);
  const closeDelete = useBookingPageStore((state) => state.closeDelete);
  const closeEditor = useBookingPageStore((state) => state.closeEditor);
  const mutation = useDeleteBookingMutation();

  const confirm = async () => {
    if (!deleting) return;
    try {
      await mutation.mutateAsync(deleting.id);
      toast.success(DELETE_TEXT.done);
    } catch (error) {
      if (!hasStatus(error, STATUS_NOT_FOUND)) {
        toast.error(apiErrorMessage(error));
        return;
      }
      toast.info(DELETE_TEXT.alreadyGone);
    }
    closeDelete();
    closeEditor();
  };

  return { deleting, isPending: mutation.isPending, confirm, cancel: closeDelete };
};
