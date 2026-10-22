'use client';

import { AlertCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';
import { BOOKING_TITLE_MAX } from '@/entities/booking';
import type { Booking } from '@/entities/booking';
import type { ZonedNow } from '@/shared/lib/time';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { DialogClose, DialogFooter } from '@/shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';
import { toDate } from '../../lib/formatDate';
import {
  END_TIMES,
  START_TIMES,
  isEndDisabled,
  isStartDisabled,
  unavailableDays,
} from '../../lib/schedule';
import type { BookingEditor } from '../../model/bookingPageStore';
import { useBookingForm } from '../../model/useBookingForm';
import { DatePicker } from './DatePicker';
import { TimeSelect } from './TimeSelect';

type Props = {
  editor: BookingEditor;
  now: ZonedNow;
  onSaved: (date: string) => void;
  onClose: () => void;
  onDelete: (booking: Booking) => void;
};

export const BookingForm = ({ editor, now, onSaved, onClose, onDelete }: Props) => {
  const { form, date, start, others, submit, changeDate, changeStart, changeEnd } = useBookingForm({
    editor,
    now,
    onSaved,
    onClose,
  });
  const t = useTranslations('booking.form');
  const { errors, isSubmitting, isDirty } = form.formState;
  const isEdit = editor.mode === 'edit';

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={isSubmitting}>
      {errors.root?.server && (
        <Alert variant="destructive" role="alert">
          <AlertCircleIcon />
          <AlertDescription className="wrap-anywhere">
            {errors.root.server.message}
          </AlertDescription>
        </Alert>
      )}
      <FieldGroup className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="date"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2">
              <FieldLabel htmlFor="booking-date">{t('date')}</FieldLabel>
              <DatePicker
                id="booking-date"
                describedBy={fieldState.invalid ? 'booking-date-error' : undefined}
                value={field.value}
                disabled={unavailableDays(toDate(now.date))}
                isInvalid={fieldState.invalid}
                onChange={changeDate}
                className="w-full"
              />
              <FieldError
                id="booking-date-error"
                errors={[fieldState.error]}
                className="wrap-anywhere"
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="start"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="booking-start">{t('start')}</FieldLabel>
              <TimeSelect
                id="booking-start"
                describedBy={fieldState.invalid ? 'booking-start-error' : undefined}
                value={field.value}
                options={START_TIMES}
                isOptionDisabled={(time) => isStartDisabled(time, date, now, others)}
                isInvalid={fieldState.invalid}
                onChange={changeStart}
                onBlur={field.onBlur}
              />
              <FieldError
                id="booking-start-error"
                errors={[fieldState.error]}
                className="wrap-anywhere"
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="end"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="booking-end">{t('end')}</FieldLabel>
              <TimeSelect
                id="booking-end"
                describedBy={fieldState.invalid ? 'booking-end-error' : undefined}
                value={field.value}
                options={END_TIMES}
                isOptionDisabled={(time) => Boolean(start) && isEndDisabled(time, start, others)}
                isInvalid={fieldState.invalid}
                onChange={changeEnd}
                onBlur={field.onBlur}
              />
              <FieldError
                id="booking-end-error"
                errors={[fieldState.error]}
                className="wrap-anywhere"
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2">
              <FieldLabel htmlFor="booking-title">{t('title')}</FieldLabel>
              <Input
                {...field}
                id="booking-title"
                aria-describedby={fieldState.invalid ? 'booking-title-error' : undefined}
                maxLength={BOOKING_TITLE_MAX}
                placeholder={t('titlePlaceholder')}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
              />
              <FieldError
                id="booking-title-error"
                errors={[fieldState.error]}
                className="wrap-anywhere"
              />
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter className="gap-2 sm:justify-between">
        {editor.mode === 'edit' ? (
          <Button
            type="button"
            variant="ghost"
            className="text-danger-strong"
            disabled={isSubmitting}
            onClick={() => onDelete(editor.booking)}
          >
            {t('delete')}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              {t('cancel')}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isSubmitting || (isEdit && !isDirty)}>
            {isSubmitting && <Spinner />}
            {editor.mode === 'edit' ? t('submitEdit') : t('submitCreate')}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
};
