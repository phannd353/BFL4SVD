import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrainingJobTable } from "./_components/training-job-table";

export const metadata: Metadata = {
  title: "Training Job Management",
  description: "Manage federated learning training jobs",
};

function TrainingJobTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="mb-2 flex w-full flex-wrap items-end justify-between gap-2">
        <div className="flex items-end gap-2">
          <Skeleton className="h-10 w-[220px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <Skeleton className="h-10 w-[150px]" />
      </div>
      <div className="overflow-hidden rounded-lg border-2 border-muted">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminTrainingJobsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<TrainingJobTableSkeleton />}>
        <TrainingJobTable />
      </Suspense>
    </div>
  );
}
