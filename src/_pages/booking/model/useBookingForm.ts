'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { useCreateBookingMutation, useUpdateBookingMutation } from '@/entities/booking';
import { apiErrorMessage, hasStatus } from '@/shared/lib/errors';
import { defaultEnd, firstFreeStart, isEndDisabled } from '../lib/schedule';
import { withBookingRules } from './bookingForm.schema';
import type { BookingFormValues, BookingRulesContext } from './bookingForm.schema';
import { FORM_TEXT } from './bookingPage.data';
import type { BookingEditor } from './bookingPageStore';

type Params = Omit<BookingRulesContext, 'ignoreId'> & {
  editor: BookingEditor;
  onDone: () => void;
};

const STATUS_CONFLICT = 409;
const STATUS_NOT_FOUND = 404;

const initialValues = ({ editor, date, now, bookings }: Params): BookingFormValues => {
  if (editor.mode === 'edit') {
    const { start, end, title } = editor.booking;
    return { start, end, title: title ?? '' };
  }
  const start = editor.start ?? firstFreeStart(date, now, bookings) ?? '';
  return { start, end: start ? defaultEnd(start) : '', title: '' };
};

export const useBookingForm = (params: Params) => {
  const { editor, date, now, bookings, onDone } = params;
  const ignoreId = editor.mode === 'edit' ? editor.booking.id : undefined;
  const rules: BookingRulesContext = { date, now, bookings, ignoreId };
  const context = useRef(rules);
  useEffect(() => {
    context.current = rules;
  });

  const resolver: Resolver<BookingFormValues> = (values, ctx, options) =>
    zodResolver(withBookingRules(context.current))(values, ctx, options);

  const form = useForm<BookingFormValues>({
    resolver,
    defaultValues: initialValues(params),
    mode: 'onTouched',
  });

  const create = useCreateBookingMutation();
  const update = useUpdateBookingMutation();

  const changeStart = (start: string) => {
    form.setValue('start', start, { shouldValidate: true, shouldDirty: true });
    if (isEndDisabled(form.getValues('end'), start)) {
      form.setValue('end', defaultEnd(start), { shouldValidate: true, shouldDirty: true });
    }
  };

  const submit = form.handleSubmit(async (values) => {
    const body = { date, ...values };
    try {
      if (editor.mode === 'edit') {
        await update.mutateAsync({ id: editor.booking.id, ...body });
        toast.success(FORM_TEXT.updated);
      } else {
        await create.mutateAsync(body);
        toast.success(FORM_TEXT.created);
      }
      onDone();
    } catch (error) {
      if (hasStatus(error, STATUS_NOT_FOUND)) {
        toast.error(FORM_TEXT.goneTitle, { description: apiErrorMessage(error) });
        onDone();
        return;
      }
      const hint = hasStatus(error, STATUS_CONFLICT) ? ` ${FORM_TEXT.conflictHint}` : '';
      form.setError('root.server', { message: `${apiErrorMessage(error)}.${hint}` });
    }
  });

  return { form, submit, changeStart };
};
