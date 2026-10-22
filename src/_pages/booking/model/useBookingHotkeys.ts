'use client';

import { useEffect, useRef } from 'react';

type Actions = {
  prev: () => void;
  next: () => void;
  today: () => void;
  create: () => void;
};

const KEYS: Record<string, keyof Actions> = {
  ArrowLeft: 'prev',
  ArrowRight: 'next',
  KeyT: 'today',
  KeyN: 'create',
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    Boolean(target.closest('input, textarea, select, [role="combobox"]')));

const hasOpenOverlay = () =>
  Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"]'));

export const useBookingHotkeys = (actions: Actions) => {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = KEYS[event.code];
      if (!action || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target) || hasOpenOverlay()) return;
      event.preventDefault();
      latest.current[action]();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
