import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivitySkeleton() {
  return (
    <AppLayout>
      <div className="px-4 pt-10 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
