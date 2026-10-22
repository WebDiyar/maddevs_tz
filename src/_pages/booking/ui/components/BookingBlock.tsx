import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Booking } from '@/entities/booking';
import { bookingBlockVariants } from './bookingBlockVariants';

type Props = {
  booking: Booking;
  isLocked: boolean;
  onEdit: () => void;
};

export const BookingBlock = ({ booking, isLocked, onEdit }: Props) => {
  const t = useTranslations('booking.schedule');
  const time = `${booking.start}–${booking.end}`;
  const title = booking.title || t('untitled');

  if (isLocked) {
    return (
      <div className={bookingBlockVariants({ locked: true })}>
        <LockIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
        <span className="truncate">
          <span className="font-mono">{time}</span> · {title}
          <span className="sr-only">{t('locked')}</span>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={t('edit', { time, title })}
      className={bookingBlockVariants({ locked: false })}
    >
      <span className="truncate">
        <span className="font-mono font-medium">{time}</span> · {title}
      </span>
    </button>
  );
};
