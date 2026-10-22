import { LockIcon } from 'lucide-react';
import type { Booking } from '@/entities/booking';
import { bookingBlockVariants } from './bookingBlockVariants';

type Props = {
  booking: Booking;
  isLocked: boolean;
  onEdit: () => void;
};

export const BookingBlock = ({ booking, isLocked, onEdit }: Props) => {
  const time = `${booking.start}–${booking.end}`;
  const title = booking.title || 'Без названия';

  if (isLocked) {
    return (
      <div className={bookingBlockVariants({ locked: true })}>
        <LockIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
        <span className="truncate">
          <span className="font-mono">{time}</span> · {title}
          <span className="sr-only"> — время прошло, изменить нельзя</span>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Изменить бронь ${time}, ${title}`}
      className={bookingBlockVariants({ locked: false })}
    >
      <span className="truncate">
        <span className="font-mono font-medium">{time}</span> · {title}
      </span>
    </button>
  );
};
