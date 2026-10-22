'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Button } from '@/shared/ui/button';
import { THEMES } from './nav.config';
import type { Theme } from './nav.config';

const ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon } as const;

const subscribe = () => () => {};

const isTheme = (value: string | undefined): value is Theme =>
  THEMES.some((theme) => theme === value);

export const ThemeSwitch = () => {
  const t = useTranslations('header.theme');
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current: Theme = isMounted && isTheme(theme) ? theme : 'system';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  const Icon = ICONS[current];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t('label', { current: t(current), next: t(next) })}
      title={t('label', { current: t(current), next: t(next) })}
      onClick={() => setTheme(next)}
    >
      <Icon />
    </Button>
  );
};
