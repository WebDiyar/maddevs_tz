'use client';

import { useMessages, useTranslations } from 'next-intl';

export const AboutPage = () => {
  const t = useTranslations('about');
  const { sections } = useMessages().about;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <title>{t('metaTitle')}</title>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <nav aria-label={t('contents')} className="rounded-lg border p-4">
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline-offset-4 hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={section.id}
          className="flex scroll-mt-20 flex-col gap-3"
        >
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
        </section>
      ))}
    </main>
  );
};
