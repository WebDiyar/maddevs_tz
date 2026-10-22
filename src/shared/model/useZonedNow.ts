'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { zonedNow } from '@/shared/lib/time';
import type { ZonedNow } from '@/shared/lib/time';

const TICK_MS = 10_000;

const subscribe = (onChange: () => void) => {
  const timer = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(timer);
};

const parse = (snapshot: string): ZonedNow => {
  const [date, minutes] = snapshot.split('|');
  return { date, minutes: Number(minutes) };
};

export const useZonedNow = (): ZonedNow | null => {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const now = zonedNow();
      return `${now.date}|${Math.ceil(now.minutes)}`;
    },
    () => null,
  );
  return useMemo(() => (snapshot === null ? null : parse(snapshot)), [snapshot]);
};
