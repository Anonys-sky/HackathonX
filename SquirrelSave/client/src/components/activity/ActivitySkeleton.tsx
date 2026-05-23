import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivitySkeleton() {
  return (
    <AppLayout>
      <div className="max-w-[430px] mx-auto w-full pb-28 space-y-4 px-4 pt-4 bg-[oklch(0.98_0.015_25)]">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </AppLayout>
  );
}
