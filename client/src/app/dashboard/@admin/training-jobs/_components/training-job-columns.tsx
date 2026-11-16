import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { TrainingJobResponseDto } from "@/types";
import { formatGasUsed } from "@/utils/gas.util";
import { TrainingJobActions } from "./training-job-actions";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : format(date, "MMM d, yyyy 'at' h:mm a");
}

function statusClass(status: TrainingJobResponseDto["status"]) {
  switch (status) {
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200";
    case "RUNNING":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200";
    case "COMPLETED":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-200";
    case "STOPPED":
      return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-200";
    case "CANCELLED":
      return "border-muted-foreground/30 bg-muted text-muted-foreground";
    default:
      return "border-muted-foreground/30 bg-muted text-muted-foreground";
  }
}

export function getTrainingJobColumns({
  handleActionComplete,
}: {
  handleActionComplete: () => void;
}): ColumnDef<TrainingJobResponseDto>[] {
  return [
    {
      id: "job",
      header: "Training job",
      cell: ({ row }) => {
        const job = row.original;
        return (
          <Link
            href={`/dashboard/training-jobs/${encodeURIComponent(job.id)}`}
            className="group flex min-w-[180px] flex-col gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View details for ${job.name}`}
          >
            <span className="font-medium text-foreground group-hover:underline">
              {job.name}
            </span>
            <span
              className="max-w-[320px] truncate text-xs text-muted-foreground"
              title={job.description || undefined}
            >
              {job.description || "No description"}
            </span>
            <code className="text-[11px] text-muted-foreground" title={job.id}>
              {job.id}
            </code>
          </Link>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={statusClass(row.original.status)}>
          {row.original.status.charAt(0) +
            row.original.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      id: "rounds",
      header: "Rounds",
      cell: ({ row }) => {
        const { currentRound, plannedRounds } = row.original;
        return (
          <span className="whitespace-nowrap text-sm">
            {currentRound}
            {plannedRounds !== null ? ` / ${plannedRounds}` : ""}
          </span>
        );
      },
    },
    {
      id: "gasUsed",
      header: "Total gas used",
      cell: ({ row }) => (
        <span
          className="whitespace-nowrap text-sm"
          title={row.original.gasUsed ?? undefined}
        >
          {formatGasUsed(row.original.gasUsed)}
        </span>
      ),
    },
    {
      id: "schedule",
      header: "Schedule",
      cell: ({ row }) => (
        <div className="flex min-w-[150px] flex-col gap-1 text-xs">
          <span>
            Publish: {formatDate(row.original.publishAt)}
            {!row.original.publishedAt && " (scheduled)"}
          </span>
          <span className="text-muted-foreground">
            Start:{" "}
            {row.original.startAt ? formatDate(row.original.startAt) : "Manual"}
          </span>
        </div>
      ),
    },
    {
      id: "configuration",
      header: "Configuration",
      cell: ({ row }) => {
        const { epochs, batchSize, learningRate } = row.original;
        const configuration = [
          epochs !== null ? `${epochs} epochs` : null,
          batchSize !== null ? `batch ${batchSize}` : null,
          learningRate !== null ? `lr ${learningRate}` : null,
        ].filter(Boolean);
        return (
          <span className="text-xs text-muted-foreground">
            {configuration.length ? configuration.join(" · ") : "—"}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "updatedAt",
      header: "Updated",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <TrainingJobActions
          job={row.original}
          onActionComplete={handleActionComplete}
        />
      ),
    },
  ];
}
