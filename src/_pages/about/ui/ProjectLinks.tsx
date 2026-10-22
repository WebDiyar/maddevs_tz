import { ArrowUpRightIcon } from 'lucide-react';
import { PROJECT_LINKS } from '../model/projectLinks';

type Props = {
  labels: Record<(typeof PROJECT_LINKS)[number]['key'], string>;
};

export const ProjectLinks = ({ labels }: Props) => (
  <ul className="grid gap-2 sm:grid-cols-2">
    {PROJECT_LINKS.map((link) => (
      <li key={link.key}>
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3 rounded-lg border bg-card p-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <link.icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{labels[link.key]}</span>
          <ArrowUpRightIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
          />
        </a>
      </li>
    ))}
  </ul>
);
