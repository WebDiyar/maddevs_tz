import { describe, expect, it } from 'vitest';
import {
  dayNotice,
  daySummary,
  defaultEnd,
  dragRange,
  isEndDisabled,
  isStartDisabled,
  scheduleCells,
  titleLines,
} from './schedule';

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

describe('form options', () => {
  const day = [booking('10:00', '11:00')];

  it('disables starts that cannot fit 30 free minutes', () => {
    expect(isStartDisabled('09:30', '2026-10-23', now, day)).toBe(false);
    expect(isStartDisabled('09:45', '2026-10-23', now, day)).toBe(true);
    expect(isStartDisabled('10:30', '2026-10-23', now, day)).toBe(true);
    expect(isStartDisabled('11:00', '2026-10-23', now, day)).toBe(false);
  });

  it('disables ends that cross another booking', () => {
    expect(isEndDisabled('10:00', '09:00', day)).toBe(false);
    expect(isEndDisabled('10:15', '09:00', day)).toBe(true);
    expect(defaultEnd('09:15', day)).toBe('10:00');
  });
});

describe('dragRange', () => {
  const day = [booking('12:00', '13:00')];
  const at = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

  it('stops at the next booking and the 2-hour limit', () => {
    expect(dragRange(at('11:00'), at('12:40'), '2026-10-23', now, day)).toMatchObject({
      start: '11:00',
      end: '12:00',
    });
    expect(dragRange(at('14:00'), at('17:50'), '2026-10-23', now, day)).toMatchObject({
      start: '14:00',
      end: '16:00',
    });
  });

  it('supports dragging upwards and flags too short ranges', () => {
    expect(dragRange(at('15:00'), at('14:10'), '2026-10-23', now, day)).toMatchObject({
      start: '14:00',
      end: '15:15',
      isValid: true,
    });
    expect(dragRange(at('15:00'), at('15:05'), '2026-10-23', now, day)?.isValid).toBe(false);
  });

  it('ignores starts inside bookings or in the past', () => {
    expect(dragRange(at('12:10'), at('14:00'), '2026-10-23', now, day)).toBeNull();
    expect(dragRange(at('11:00'), at('12:00'), '2026-10-22', now, [])).toBeNull();
  });
});

describe('daySummary', () => {
  it('ignores gaps too short to book', () => {
    const late = { date: '2026-10-22', minutes: 17 * 60 + 40 };
    expect(daySummary('2026-10-22', late, []).freeMinutes).toBe(0);
    const day = [booking('09:00', '10:45'), booking('11:00', '18:00')];
    expect(daySummary('2026-10-23', now, day).freeMinutes).toBe(0);
  });

  it('counts free time from now on', () => {
    expect(daySummary('2026-10-23', now, [booking('10:00', '11:00')])).toEqual({
      count: 1,
      freeMinutes: 8 * 60,
    });
    expect(daySummary('2026-10-22', now, []).freeMinutes).toBe(18 * 60 - (12 * 60 + 30));
  });
});

describe('titleLines', () => {
  it('fits the title under the time when the block is tall enough', () => {
    expect(titleLines('10:00', '10:30')).toBe(0);
    expect(titleLines('10:00', '11:00')).toBeGreaterThanOrEqual(2);
    expect(titleLines('10:00', '12:00')).toBeGreaterThan(titleLines('10:00', '11:00'));
  });
});
