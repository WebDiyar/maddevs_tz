'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import {
  BOOKING_TITLE_MAX,
  useBookingsQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
} from '@/entities/booking';
import { apiErrorMessage, isConflict, isNotFound } from '@/shared/lib/errors';
import type { ZonedNow } from '@/shared/lib/time';
import { defaultEnd, isEndDisabled } from '../lib/schedule';
import { bookingFormSchema } from './bookingForm.schema';
import type { BookingFormValues, BookingRulesContext } from './bookingForm.schema';
import type { BookingEditor } from './bookingPageStore';

type Params = {
  editor: BookingEditor;
  now: ZonedNow;
  onSaved: (date: string) => void;
  onClose: () => void;
};

const NO_BOOKINGS: never[] = [];

const initialValues = (editor: BookingEditor): BookingFormValues => {
  if (editor.mode === 'edit') {
    const { date, start, end, title } = editor.booking;
    return { date, start, end, title: title ?? '' };
  }
  return { date: editor.date, start: editor.start, end: editor.end, title: '' };
};

export const useBookingForm = ({ editor, now, onSaved, onClose }: Params) => {
  const t = useTranslations('booking.form');
  const locale = useLocale();
  const ignoreId = editor.mode === 'edit' ? editor.booking.id : undefined;
  const text = {
    pickDate: t('pickDate'),
    pickStart: t('pickStart'),
    pickEnd: t('pickEnd'),
    titleTooLong: t('titleTooLong', { max: BOOKING_TITLE_MAX }),
  };
  const context = useRef<BookingRulesContext>({
    now,
    bookings: NO_BOOKINGS,
    ignoreId,
    locale,
    text,
  });

  const resolver: Resolver<BookingFormValues> = (values, ctx, options) =>
    zodResolver(bookingFormSchema(context.current))(values, ctx, options);

  const form = useForm<BookingFormValues>({
    resolver,
    defaultValues: initialValues(editor),
    mode: 'onTouched',
  });

  const [date, start] = useWatch({ control: form.control, name: ['date', 'start'] });
  const query = useBookingsQuery(date);
  const bookings = (query.isPlaceholderData ? undefined : query.data) ?? NO_BOOKINGS;
  const others = bookings.filter((booking) => booking.id !== ignoreId);
  useEffect(() => {
    context.current = { now, bookings, ignoreId, locale, text };
  });

  const create = useCreateBookingMutation();
  const update = useUpdateBookingMutation();

  const revalidate = () => void form.trigger(['date', 'start', 'end']);

  const changeDate = (next: string) => {
    form.setValue('date', next, { shouldDirty: true, shouldTouch: true });
    revalidate();
  };

  const changeStart = (next: string) => {
    form.setValue('start', next, { shouldDirty: true, shouldTouch: true });
    if (isEndDisabled(form.getValues('end'), next, others)) {
      form.setValue('end', defaultEnd(next, others), { shouldDirty: true });
    }
    revalidate();
  };

  const changeEnd = (next: string) => {
    form.setValue('end', next, { shouldDirty: true, shouldTouch: true });
    revalidate();
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      if (editor.mode === 'edit') {
        await update.mutateAsync({ id: editor.booking.id, ...values });
        toast.success(t('updated'));
      } else {
        await create.mutateAsync(values);
        toast.success(t('created'));
      }
      onSaved(values.date);
    } catch (error) {
      if (isNotFound(error)) {
        toast.error(t('gone'), { description: apiErrorMessage(error, locale) });
        onClose();
        return;
      }
      const hint = isConflict(error) ? ` ${t('conflictHint')}` : '';
      form.setError('root.server', { message: `${apiErrorMessage(error, locale)}.${hint}` });
    }
  });

  return { form, date, start, others, submit, changeDate, changeStart, changeEnd };
};
