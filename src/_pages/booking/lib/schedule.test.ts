import { describe, expect, it } from 'vitest';
import { dayNotice, scheduleCells } from './schedule';

const now = { date: '2026-10-22', minutes: 12 * 60 + 20 };
const booking = (start: string, end: string) => ({ id: start, date: '2026-10-23', start, end });
const cell = (cells: ReturnType<typeof scheduleCells>, start: string) =>
  cells.find((item) => item.start === start);

describe('scheduleCells', () => {
  it('offers the free part of a partially booked cell', () => {
    const cells = scheduleCells('2026-10-23', now, [booking('10:15', '10:45')]);
    expect(cell(cells, '10:00')?.freeStart).toBeNull();
    expect(cell(cells, '10:30')?.freeStart).toBe('10:45');
  });

  it('starts today from the nearest future step', () => {
    const cells = scheduleCells('2026-10-22', now, []);
    expect(cell(cells, '12:00')?.freeStart).toBeNull();
    expect(cell(cells, '12:30')?.freeStart).toBe('12:30');
  });

  it('closes weekends', () => {
    expect(scheduleCells('2026-10-24', now, []).every((item) => item.freeStart === null)).toBe(
      true,
    );
  });
});

describe('dayNotice', () => {
  it('tells a fully booked day from a finished one', () => {
    expect(dayNotice('future', now, false)).toBe('fullyBooked');
    expect(dayNotice('today', now, false)).toBe('fullyBooked');
    expect(dayNotice('today', { ...now, minutes: 17 * 60 + 40 }, false)).toBe('dayOver');
    expect(dayNotice('future', now, true)).toBeNull();
  });
});
