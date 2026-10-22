'use client';

import { useState } from 'react';
import type { PointerEvent } from 'react';
import type { Booking } from '@/entities/booking';
import type { ZonedNow } from '@/shared/lib/time';
import { dragRange, pointerMinutes } from '../lib/schedule';
import type { DragRange } from '../lib/schedule';

type Params = {
  date: string;
  now: ZonedNow;
  bookings: readonly Booking[];
  onSelect: (start: string, end: string) => void;
};

type Drag = { anchor: number; startY: number; range: DragRange | null; moved: boolean };

const MOVE_THRESHOLD_PX = 6;

const ratioOf = (event: PointerEvent<HTMLElement>) => {
  const box = event.currentTarget.getBoundingClientRect();
  return (event.clientY - box.top) / box.height;
};

export const useDragSelect = ({ date, now, bookings, onSelect }: Params) => {
  const [drag, setDrag] = useState<Drag | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const anchor = pointerMinutes(ratioOf(event));
    const range = dragRange(anchor, anchor, date, now, bookings);
    if (!range) return;
    setDrag({ anchor, startY: event.clientY, range, moved: false });
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!drag) return;
    const moved = drag.moved || Math.abs(event.clientY - drag.startY) > MOVE_THRESHOLD_PX;
    if (moved && !drag.moved) event.currentTarget.setPointerCapture(event.pointerId);
    const range = dragRange(drag.anchor, pointerMinutes(ratioOf(event)), date, now, bookings);
    setDrag({ ...drag, moved, range });
  };

  const onPointerUp = () => {
    if (drag?.moved && drag.range?.isValid) onSelect(drag.range.start, drag.range.end);
    setDrag(null);
  };

  return {
    preview: drag?.moved ? drag.range : null,
    isDragging: Boolean(drag?.moved),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => setDrag(null) },
  };
};
