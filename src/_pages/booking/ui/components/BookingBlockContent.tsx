import { LockIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

type Props = {
  time: string;
  title: string;
  lines: number;
  isLocked: boolean;
};

export const BookingBlockContent = ({ time, title, lines, isLocked }: Props) => {
  const timeLabel = (
    <span className="flex shrink-0 items-center gap-1 font-mono font-medium">
      {isLocked && <LockIcon aria-hidden className="size-3" />}
      {time}
    </span>
  );

  if (lines < 1) {
    return (
      <span className="flex w-full min-w-0 gap-1">
        {timeLabel}
        <span aria-hidden>·</span>
        <span className="truncate">{title}</span>
      </span>
    );
  }

  return (
    <>
      {timeLabel}
      <span
        style={{ '--lines': lines } as CSSProperties}
        className="line-clamp-(--lines) w-full wrap-anywhere"
      >
        {title}
      </span>
    </>
  );
};
