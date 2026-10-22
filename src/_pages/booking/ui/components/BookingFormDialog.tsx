'use client';

import type { Booking } from '@/entities/booking';
import type { ZonedNow } from '@/shared/lib/time';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { formatLongDate } from '../../lib/formatDate';
import { FORM_TEXT } from '../../model/bookingPage.data';
import { useBookingPageStore } from '../../model/bookingPageStore';
import { BookingForm } from './BookingForm';

type Props = {
  date: string;
  now: ZonedNow;
  bookings: readonly Booking[];
};

export const BookingFormDialog = ({ date, now, bookings }: Props) => {
  const editor = useBookingPageStore((state) => state.editor);
  const isOpen = useBookingPageStore((state) => state.isEditorOpen);
  const closeEditor = useBookingPageStore((state) => state.closeEditor);
  const askDelete = useBookingPageStore((state) => state.askDelete);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editor?.mode === 'edit' ? FORM_TEXT.editTitle : FORM_TEXT.createTitle}
          </DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {formatLongDate(date)}
          </DialogDescription>
        </DialogHeader>
        {editor && (
          <BookingForm
            key={editor.mode === 'edit' ? editor.booking.id : `new-${editor.start}`}
            editor={editor}
            date={date}
            now={now}
            bookings={bookings}
            onDone={closeEditor}
            onDelete={askDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
