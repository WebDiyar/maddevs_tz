'use client';

import { CalendarIcon } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import type { Matcher } from 'react-day-picker';
import { cn } from 'cn';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  DATE_LOCALES,
  formatLongDate,
  formatShortDate,
  fromDate,
  toDate,
} from '../../lib/formatDate';

type Props = {
  id?: string;
  value: string;
  disabled?: Matcher[];
  isInvalid?: boolean;
  describedBy?: string;
  className?: string;
  onChange: (date: string) => void;
};

export const DatePicker = ({
  id,
  value,
  disabled,
  isInvalid,
  describedBy,
  className,
  onChange,
}: Props) => {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          className={cn('min-w-0 justify-start', className)}
        >
          <CalendarIcon className="max-[380px]:hidden" />
          <span className="truncate first-letter:uppercase sm:hidden">
            {formatShortDate(value, locale)}
          </span>
          <span className="hidden truncate first-letter:uppercase sm:inline">
            {formatLongDate(value, locale)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={DATE_LOCALES[locale]}
          selected={toDate(value)}
          defaultMonth={toDate(value)}
          disabled={disabled}
          required
          onSelect={(day) => {
            onChange(fromDate(day));
            setIsOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
