import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export function FileCardSkeleton() {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        {/* Icon Placeholder */}
        <Skeleton className="h-8 w-8 rounded" />
        <div className="flex-1 space-y-1.5">
          {/* File Name Placeholder */}
          <Skeleton className="h-5 w-3/4" />
          {/* File Size Placeholder */}
          <Skeleton className="h-3 w-1/4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 pb-3">
        {/* Downloads Placeholder */}
        <Skeleton className="h-3 w-1/2" />
        {/* Expiry Placeholder */}
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-0 border-t pt-3">
        {/* Button Placeholders */}
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </CardFooter>
    </Card>
  );
} 