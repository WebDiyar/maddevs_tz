'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { makeQueryClient } from '@/shared/api';
import { Toaster } from '@/shared/ui/sonner';

type Props = {
  children: ReactNode;
};

export const AppProviders = ({ children }: Props) => {
  const [client] = useState(makeQueryClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
