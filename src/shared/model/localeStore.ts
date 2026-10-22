import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LOCALE } from '@/shared/config';
import type { Locale } from '@/shared/config';

type State = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<State>()(
  persist((set) => ({ locale: DEFAULT_LOCALE, setLocale: (locale) => set({ locale }) }), {
    name: 'booking-locale',
    skipHydration: true,
  }),
);
