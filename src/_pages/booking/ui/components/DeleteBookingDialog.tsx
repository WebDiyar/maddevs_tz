'use client';

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
import { DELETE_TEXT } from '../../model/bookingPage.data';
import { useDeleteBooking } from '../../model/useDeleteBooking';

export const DeleteBookingDialog = () => {
  const { deleting, isPending, confirm, cancel } = useDeleteBooking();

  return (
    <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && !isPending && cancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{DELETE_TEXT.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {deleting &&
              `${deleting.date} ${deleting.start}–${deleting.end}${deleting.title ? ` «${deleting.title}»` : ''}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{DELETE_TEXT.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            {isPending && <Spinner />}
            {DELETE_TEXT.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
