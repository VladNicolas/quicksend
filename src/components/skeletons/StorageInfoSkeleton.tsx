import { Skeleton } from "@/components/ui/skeleton";

export function StorageInfoSkeleton() {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-center mb-3">
        {/* Placeholder for "Storage Usage" text */}
        <Skeleton className="h-4 w-1/4" />
        {/* Placeholder for "xxx MB / x GB" text */}
        <Skeleton className="h-4 w-1/3" />
      </div>
      {/* Placeholder for Progress bar */}
      <Skeleton className="h-2 w-full" />
    </div>
  );
} 