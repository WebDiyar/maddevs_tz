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
import { apiErrorMessage, hasStatus } from '@/shared/lib/errors';
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

const STATUS_CONFLICT = 409;
const STATUS_NOT_FOUND = 404;
const NO_BOOKINGS: never[] = [];

const initialValues = (editor: BookingEditor): BookingFormValues => {
  if (editor.mode === 'edit') {
    const { date, start, end, title } = editor.booking;
    return { date, start, end, title: title ?? '' };
  }
  return { date: editor.date, start: editor.start, end: defaultEnd(editor.start), title: '' };
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
  const bookings = useBookingsQuery(date).data ?? NO_BOOKINGS;
  useEffect(() => {
    context.current = { now, bookings, ignoreId, locale, text };
  });

  const create = useCreateBookingMutation();
  const update = useUpdateBookingMutation();

  const changeDate = (next: string) => {
    form.setValue('date', next, { shouldValidate: true, shouldDirty: true });
  };

  const changeStart = (next: string) => {
    form.setValue('start', next, { shouldValidate: true, shouldDirty: true });
    if (isEndDisabled(form.getValues('end'), next)) {
      form.setValue('end', defaultEnd(next), { shouldValidate: true, shouldDirty: true });
    }
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
      if (hasStatus(error, STATUS_NOT_FOUND)) {
        toast.error(t('gone'), { description: apiErrorMessage(error, locale) });
        onClose();
        return;
      }
      const hint = hasStatus(error, STATUS_CONFLICT) ? ` ${t('conflictHint')}` : '';
      form.setError('root.server', { message: `${apiErrorMessage(error, locale)}.${hint}` });
    }
  });

  return { form, date, start, submit, changeDate, changeStart };
};
