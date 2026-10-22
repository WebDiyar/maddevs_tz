import { describe, expect, it } from 'vitest';
import { findRuleViolation } from './bookingRules';
import { ruleMessage } from './ruleMessage';

const now = { date: '2026-10-22', minutes: 12 * 60 };
const bookings = [{ id: 'a', date: '2026-10-23', start: '10:00', end: '11:00', title: 'Планёрка' }];
const check = (start: string, end: string, date = '2026-10-23', ignoreId?: string) =>
  findRuleViolation({ date, start, end }, { bookings, now, ignoreId })?.code ?? null;

describe('findRuleViolation', () => {
  it('accepts a valid slot and touching borders', () => {
    expect(check('11:00', '12:00')).toBeNull();
    expect(check('09:00', '10:00')).toBeNull();
    expect(check('16:00', '18:00')).toBeNull();
  });

  it('keeps the slot inside the workday', () => {
    expect(check('08:30', '09:30')).toBe('START_OUTSIDE_WORKDAY');
    expect(check('17:30', '18:30')).toBe('END_OUTSIDE_WORKDAY');
  });

  it('enforces order and duration limits', () => {
    expect(check('13:00', '13:00')).toBe('START_NOT_BEFORE_END');
    expect(check('14:00', '13:00')).toBe('START_NOT_BEFORE_END');
    expect(check('13:00', '13:15')).toBe('TOO_SHORT');
    expect(check('13:00', '15:15')).toBe('TOO_LONG');
    expect(check('13:00', '13:30')).toBeNull();
    expect(check('13:00', '15:00')).toBeNull();
  });

  it('rejects overlaps but not with the booking being edited', () => {
    expect(check('10:30', '11:30')).toBe('CONFLICT');
    expect(check('09:30', '12:00')).toBe('TOO_LONG');
    expect(check('09:30', '10:30')).toBe('CONFLICT');
    expect(check('10:15', '10:45')).toBe('CONFLICT');
    expect(check('10:15', '10:45', '2026-10-23', 'a')).toBeNull();
  });

  it('keeps start and end on the 15-minute grid', () => {
    expect(check('10:07', '10:52')).toBe('OFF_GRID');
    expect(check('13:00', '13:40')).toBe('OFF_GRID');
    expect(check('13:15', '13:45')).toBeNull();
  });

  it('allows weekdays only', () => {
    expect(check('13:00', '14:00', '2026-10-24')).toBe('WEEKEND');
    expect(check('13:00', '14:00', '2026-10-25')).toBe('WEEKEND');
    expect(check('13:00', '14:00', '2026-10-26')).toBeNull();
  });

  it('formats violations in both languages', () => {
    const weekend = findRuleViolation(
      { date: '2026-10-24', start: '13:00', end: '14:00' },
      { bookings, now },
    );
    expect(weekend && ruleMessage(weekend, 'ru')).toMatch(/будням/);
    expect(weekend && ruleMessage(weekend, 'en')).toMatch(/weekdays/);
    const conflict = findRuleViolation(
      { date: '2026-10-23', start: '10:30', end: '11:30' },
      { bookings, now },
    );
    expect(conflict && ruleMessage(conflict, 'ru')).toBe(
      'Пересекается с бронью 10:00–11:00 «Планёрка»',
    );
  });

  it('forbids past dates and past time today', () => {
    expect(check('13:00', '14:00', '2026-10-21')).toBe('PAST_DATE');
    expect(check('11:30', '12:30', '2026-10-22')).toBe('PAST_TIME');
    expect(check('12:00', '13:00', '2026-10-22')).toBeNull();
  });
});
