import { QueryClient } from '@tanstack/react-query';
import { QUERY_STALE_MS } from '@/shared/config';
import { shouldRetryQuery } from '@/shared/lib/errors';

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_MS,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: true,
      },
    },
  });
