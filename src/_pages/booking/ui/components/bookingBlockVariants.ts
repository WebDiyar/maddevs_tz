import { cva } from 'class-variance-authority';

export const bookingBlockVariants = cva(
  'flex size-full min-h-0 flex-col items-start overflow-hidden rounded-md border px-2 py-1 text-left text-xs/4',
  {
    variants: {
      locked: {
        true: 'border-border bg-muted text-muted-foreground',
        false:
          'border-info-border bg-info-soft text-info-strong outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring',
      },
    },
  },
);
