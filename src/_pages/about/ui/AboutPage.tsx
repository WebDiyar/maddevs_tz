'use client';

import { useMessages, useTranslations } from 'next-intl';
import { ProjectLinks } from './ProjectLinks';

export const AboutPage = () => {
  const t = useTranslations('about');
  const { sections } = useMessages().about;

  return (
    <main className="mx-auto grid w-full max-w-page 2xl:max-w-page-wide gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[16rem_minmax(0,48rem)]">
      <title>{t('metaTitle')}</title>
      <header className="flex flex-col gap-1 lg:col-start-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <nav
        aria-label={t('contents')}
        className="rounded-lg border p-4 lg:sticky lg:top-20 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start lg:border-0 lg:p-0"
      >
        <p className="mb-2 hidden text-xs font-medium tracking-wide text-muted-foreground uppercase lg:block">
          {t('contents')}
        </p>
        <ol className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-1 lg:border-l">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-sm py-0.5 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring lg:-ml-px lg:border-l lg:border-transparent lg:py-1 lg:pl-3 lg:text-muted-foreground lg:no-underline lg:hover:border-foreground lg:hover:text-foreground"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-col gap-8 lg:col-start-2">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id} className="flex flex-col gap-3">
            <h2 id={section.id} className="text-lg font-medium">
              {section.title}
            </h2>
            {section.items && (
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.qa && (
              <dl className="flex flex-col divide-y rounded-lg border text-sm">
                {section.qa.map(({ q, a }) => (
                  <div key={q} className="flex flex-col gap-1 p-3 sm:flex-row sm:gap-4">
                    <dt className="text-muted-foreground sm:flex-1">{q}</dt>
                    <dd className="font-medium sm:w-56 sm:shrink-0">{a}</dd>
                  </div>
                ))}
              </dl>
            )}
            {section.links && <ProjectLinks labels={section.links} />}
          </section>
        ))}
      </div>
    </main>
  );
};
