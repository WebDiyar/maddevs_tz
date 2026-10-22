'use client';

import { useTranslations } from 'next-intl';
import type { ZonedNow } from '@/shared/lib/time';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { useBookingPageStore } from '../../model/bookingPageStore';
import { BookingForm } from './BookingForm';

type Props = {
  now: ZonedNow;
};

export const BookingFormDialog = ({ now }: Props) => {
  const t = useTranslations('booking.form');
  const editor = useBookingPageStore((state) => state.editor);
  const isOpen = useBookingPageStore((state) => state.isEditorOpen);
  const closeEditor = useBookingPageStore((state) => state.closeEditor);
  const finishEditor = useBookingPageStore((state) => state.finishEditor);
  const askDelete = useBookingPageStore((state) => state.askDelete);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editor?.mode === 'edit' ? t('editTitle') : t('createTitle')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {editor && (
          <BookingForm
            key={editor.mode === 'edit' ? editor.booking.id : `new-${editor.date}-${editor.start}`}
            editor={editor}
            now={now}
            onSaved={finishEditor}
            onClose={closeEditor}
            onDelete={askDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
