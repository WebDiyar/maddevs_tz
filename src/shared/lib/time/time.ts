const MINUTES_IN_HOUR = 60;

export const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * MINUTES_IN_HOUR + minutes;
};

export const toTime = (minutes: number) => {
  const hours = String(Math.floor(minutes / MINUTES_IN_HOUR)).padStart(2, '0');
  return `${hours}:${String(minutes % MINUTES_IN_HOUR).padStart(2, '0')}`;
};

export const isCalendarDate = (value: string) =>
  DATE_PATTERN.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

export const shiftDate = (date: string, days: number) => {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

export const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

export type ZonedNow = { date: string; minutes: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone?: string) => {
  let formatter = formatters.get(timeZone ?? '');
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone ?? '', formatter);
  }
  return formatter;
};

export const zonedNow = (timeZone?: string, at: Date = new Date()): ZonedNow => {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(at)
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes:
      Number(parts.hour) * MINUTES_IN_HOUR + Number(parts.minute) + Number(parts.second) / 60,
  };
};
