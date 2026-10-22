import { AlertCircleIcon, InboxIcon, RotateCwIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty';

type Props = {
  status: 'pending' | 'error' | 'success';
  isEmpty?: boolean;
  error?: string;
  onRetry?: () => void;
  errorTitle?: string;
  retryLabel?: string;
  skeleton: ReactNode;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  children: ReactNode;
};

export const QueryZone = ({
  status,
  isEmpty = false,
  error,
  onRetry,
  errorTitle = 'Не удалось загрузить данные',
  retryLabel = 'Повторить',
  skeleton,
  emptyTitle = 'Здесь пока пусто',
  emptyDescription,
  emptyAction,
  children,
}: Props) => {
  if (status === 'pending') return <div aria-busy>{skeleton}</div>;

  if (status === 'error') {
    return (
      <Empty className="border border-dashed border-destructive/40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircleIcon className="text-destructive" />
          </EmptyMedia>
          <EmptyTitle>{errorTitle}</EmptyTitle>
          {error && <EmptyDescription>{error}</EmptyDescription>}
        </EmptyHeader>
        {onRetry && (
          <EmptyContent>
            <Button variant="outline" onClick={onRetry}>
              <RotateCwIcon data-icon="inline-start" />
              {retryLabel}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  if (isEmpty) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          {emptyDescription && <EmptyDescription>{emptyDescription}</EmptyDescription>}
        </EmptyHeader>
        {emptyAction && <EmptyContent>{emptyAction}</EmptyContent>}
      </Empty>
    );
  }

  return children;
};

export type { Props as QueryZoneProps };
