'use client';

import { useRef } from 'react';

export const useReturnFocus = () => {
  const origin = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      origin.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      if (!origin.current?.isConnected) return;
      event.preventDefault();
      origin.current.focus();
    },
  };
};
