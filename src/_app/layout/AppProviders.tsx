'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { makeQueryClient } from '@/shared/api';
import { MESSAGES } from '@/shared/i18n';
import { useLocaleStore } from '@/shared/model';
import { Toaster } from '@/shared/ui/sonner';

type Props = {
  children: ReactNode;
};

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const AppProviders = ({ children }: Props) => {
  const [client] = useState(makeQueryClient);
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    void useLocaleStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={timeZone}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={client}>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </QueryClientProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
};
