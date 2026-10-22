'use client';

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { shiftDate } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { formatLongDate, formatShortDate, fromDate, toDate } from '../../lib/formatDate';

type Props = {
  date: string;
  today: string;
  onChange: (date: string) => void;
};

export const DateNav = ({ date, today, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav aria-label="Выбор даты" className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Предыдущий день"
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-0 flex-1 justify-start sm:w-72 sm:flex-none">
            <CalendarIcon />
            <span className="truncate first-letter:uppercase sm:hidden">
              {formatShortDate(date)}
            </span>
            <span className="hidden truncate first-letter:uppercase sm:inline">
              {formatLongDate(date)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={ru}
            selected={toDate(date)}
            defaultMonth={toDate(date)}
            required
            onSelect={(day) => {
              onChange(fromDate(day));
              setIsOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        aria-label="Следующий день"
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <ChevronRightIcon />
      </Button>
      <Button variant="ghost" disabled={date === today} onClick={() => onChange(today)}>
        Сегодня
      </Button>
    </nav>
  );
};
