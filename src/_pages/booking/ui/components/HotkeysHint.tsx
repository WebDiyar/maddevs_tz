import { useTranslations } from 'next-intl';

const KBD_CLASS =
  'inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[0.7rem] text-foreground';

export const HotkeysHint = () => {
  const t = useTranslations('booking.hotkeys');
  const rows = [
    { keys: ['←', '→'], label: t('days') },
    { keys: ['T'], label: t('today') },
    { keys: ['N'], label: t('create') },
  ];

  return (
    <section aria-label={t('title')} className="hidden text-xs text-muted-foreground lg:block">
      <dl className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <dt className="flex gap-1">
              {row.keys.map((key) => (
                <kbd key={key} className={KBD_CLASS}>
                  {key}
                </kbd>
              ))}
            </dt>
            <dd>{row.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
