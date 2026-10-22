import { Skeleton } from '@/shared/ui/skeleton';

export const DayScheduleSkeleton = () => (
  <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
    <div />
    <Skeleton className="h-144 rounded-lg" />
  </div>
);
