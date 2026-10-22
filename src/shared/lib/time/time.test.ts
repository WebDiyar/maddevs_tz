import { describe, expect, it } from 'vitest';
import { isCalendarDate } from './time';

describe('isCalendarDate', () => {
  it('accepts real dates only', () => {
    expect(isCalendarDate('2026-10-23')).toBe(true);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-11-31')).toBe(false);
    expect(isCalendarDate('2026-1-5')).toBe(false);
  });
});
