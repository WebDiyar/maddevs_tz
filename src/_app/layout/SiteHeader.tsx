'use client';

import { CalendarClockIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { LocaleSwitch } from './LocaleSwitch';
import { ThemeSwitch } from './ThemeSwitch';
import { NAV_ITEMS } from './nav.config';

export const SiteHeader = () => {
  const t = useTranslations('header');
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <CalendarClockIcon aria-hidden className="size-5" />
          <span className="hidden sm:inline">{t('brand')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav aria-label={t('navLabel')} className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                >
                  <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                    <item.icon aria-hidden className="sm:hidden" />
                    <span className="max-sm:sr-only">{t(item.key)}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
          <LocaleSwitch />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
};
