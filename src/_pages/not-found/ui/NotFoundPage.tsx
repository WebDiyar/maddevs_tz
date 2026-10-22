'use client';

import { ArrowLeftIcon, SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';

export const NotFoundPage = () => {
  const t = useTranslations('notFound');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <title>{t('metaTitle')}</title>
      <SearchXIcon aria-hidden className="size-10 text-muted-foreground" />
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('description')}</p>
      <Button asChild>
        <Link href="/">
          <ArrowLeftIcon />
          {t('back')}
        </Link>
      </Button>
    </main>
  );
};
