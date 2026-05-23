import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto w-full pb-36 space-y-4 bg-[oklch(0.98_0.015_25)]">
        <Skeleton className="mx-4 mt-3 h-14 rounded-2xl" />
        <Skeleton className="mx-4 h-32 rounded-3xl" />
        <Skeleton className="mx-4 h-24 rounded-2xl" />
        <div className="px-4 grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="mx-4 h-28 rounded-2xl" />
        <Skeleton className="mx-4 h-36 rounded-2xl" />
      </div>
    </AppLayout>
  );
}
