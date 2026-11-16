import type { Metadata } from "next";
import { Suspense } from "react";
import { UserTable } from "./_components/user-table";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Manage users in the admin dashboard",
};

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end mb-2 w-full justify-between">
        <div className="flex gap-2 items-end">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <div className="overflow-hidden rounded-lg border-muted border-2">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<UsersTableSkeleton />}>
        <UserTable />
      </Suspense>
    </div>
  );
}
