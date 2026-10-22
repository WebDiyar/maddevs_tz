'use client';

import { AlertCircleIcon } from 'lucide-react';
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
import { END_TIMES, START_TIMES, isEndDisabled, isStartDisabled } from '../../lib/schedule';
import { FORM_TEXT } from '../../model/bookingPage.data';
import type { BookingEditor } from '../../model/bookingPageStore';
import { useBookingForm } from '../../model/useBookingForm';
import { TimeSelect } from './TimeSelect';

type Props = {
  editor: BookingEditor;
  date: string;
  now: ZonedNow;
  bookings: readonly Booking[];
  onDone: () => void;
  onDelete: (booking: Booking) => void;
};

export const BookingForm = ({ editor, date, now, bookings, onDone, onDelete }: Props) => {
  const { form, submit, changeStart } = useBookingForm({ editor, date, now, bookings, onDone });
  const { errors, isSubmitting } = form.formState;
  const start = form.watch('start');

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-busy={isSubmitting}>
      {errors.root?.server && (
        <Alert variant="destructive" role="alert">
          <AlertCircleIcon />
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}
      <FieldGroup className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="start"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="booking-start">{FORM_TEXT.start}</FieldLabel>
              <TimeSelect
                id="booking-start"
                value={field.value}
                options={START_TIMES}
                isOptionDisabled={(time) => isStartDisabled(time, date, now)}
                isInvalid={fieldState.invalid}
                onChange={changeStart}
                onBlur={field.onBlur}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="end"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="booking-end">{FORM_TEXT.end}</FieldLabel>
              <TimeSelect
                id="booking-end"
                value={field.value}
                options={END_TIMES}
                isOptionDisabled={(time) => Boolean(start) && isEndDisabled(time, start)}
                isInvalid={fieldState.invalid}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2">
              <FieldLabel htmlFor="booking-title">{FORM_TEXT.title}</FieldLabel>
              <Input
                {...field}
                id="booking-title"
                maxLength={BOOKING_TITLE_MAX}
                placeholder={FORM_TEXT.titlePlaceholder}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter className="gap-2 sm:justify-between">
        {editor.mode === 'edit' ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={isSubmitting}
            onClick={() => onDelete(editor.booking)}
          >
            {FORM_TEXT.delete}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              {FORM_TEXT.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {editor.mode === 'edit' ? FORM_TEXT.submitEdit : FORM_TEXT.submitCreate}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
};
