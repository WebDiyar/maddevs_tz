'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isCalendarDate } from '@/shared/lib/time';

const DATE_PARAM = 'date';

export const useSelectedDate = () => {
  const router = useRouter();
  const pathname = usePathname();
  const value = useSearchParams().get(DATE_PARAM);
  const date = value && isCalendarDate(value) ? value : null;

  const selectDate = (next: string) => {
    router.replace(`${pathname}?${DATE_PARAM}=${next}`, { scroll: false });
  };

  return { date, selectDate };
};
