import { useTranslations } from 'next-intl';
import type { Booking } from '@/entities/booking';
import { titleLines } from '../../lib/schedule';
import { BookingBlockContent } from './BookingBlockContent';
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
  const content = (
    <BookingBlockContent
      time={time}
      title={title}
      lines={titleLines(booking.start, booking.end)}
      isLocked={isLocked}
    />
  );

  if (isLocked) {
    return (
      <div title={title} className={bookingBlockVariants({ locked: true })}>
        {content}
        <span className="sr-only">{t('locked')}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      title={title}
      onClick={onEdit}
      aria-label={t('edit', { time, title })}
      className={bookingBlockVariants({ locked: false })}
    >
      {content}
    </button>
  );
};
