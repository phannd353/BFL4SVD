"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ListFilter, Search } from "lucide-react";
import { SharedTable } from "@/components/shared/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { swrFetcher } from "@/helper/swrFetcher";
import type { IPaginatedResponse } from "@/interfaces/response.interface";
import { authClient } from "@/lib/auth-client";
import type { TrainingJobStatusDto } from "@/types";
import {
  getClientTrainingJobColumns,
  type ClientTrainingJob,
} from "./client-training-job-columns";

const PAGE_SIZE = 10;
const statuses: TrainingJobStatusDto[] = [
  "WAITING",
  "RUNNING",
  "STOPPED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

export function ClientTrainingJobTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatus] = useState(
    statuses.find((jobStatus) => jobStatus === searchParams.get("status")) ??
      "all",
  );
  const [page, setPage] = useState(
    Math.max(1, Number(searchParams.get("page")) || 1),
  );
  const userId = session?.user.id;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    router.replace(`?${params.toString()}`);
  }, [debouncedSearch, status, page, router]);

  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    return `/api/client/training-jobs?${params.toString()}`;
  }, [debouncedSearch, status, page]);

  const { data, error, mutate, isLoading } = useSWR<
    IPaginatedResponse<ClientTrainingJob>
  >(swrKey, swrFetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5000,
    dedupingInterval: 2000,
  });

  const handleActionComplete = useCallback(
    (jobId: string, isJoined: boolean) => {
      if (!userId) return;

      void mutate(
        (current) =>
          current && {
            ...current,
            data: current.data.map((job) =>
              job.id === jobId
                ? {
                    ...job,
                    participantUserIds: isJoined
                      ? Array.from(new Set([...job.participantUserIds, userId]))
                      : job.participantUserIds.filter((id) => id !== userId),
                  }
                : job,
            ),
          },
        { revalidate: false },
      );
    },
    [mutate, userId],
  );

  const columns = useMemo<ColumnDef<ClientTrainingJob>[]>(
    () =>
      getClientTrainingJobColumns({
        userId,
        isSessionReady: !isSessionPending,
        handleActionComplete,
      }),
    [userId, isSessionPending, handleActionComplete],
  );

  if (error) {
    return (
      <div role="alert" className="text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  return (
    <SharedTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      setPage={setPage}
    >
      <div className="mb-2 flex w-full flex-wrap items-end gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search training jobs"
            placeholder="Search training jobs..."
            className="h-9 w-[220px] rounded-md border bg-background py-2 pl-8 pr-2 text-sm"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value) setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                All statuses
              </span>
            </SelectItem>
            {statuses.map((jobStatus) => (
              <SelectItem key={jobStatus} value={jobStatus}>
                {jobStatus.charAt(0) + jobStatus.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SharedTable>
  );
}
