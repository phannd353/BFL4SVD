import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { TrainingJobResponseDto } from "@/types";
import { ClientTrainingJobActions } from "./client-training-job-actions";

export interface ClientTrainingJob extends TrainingJobResponseDto {
  participantUserIds: string[];
}

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

export function getClientTrainingJobColumns({
  userId,
  isSessionReady,
  handleActionComplete,
}: {
  userId?: string;
  isSessionReady: boolean;
  handleActionComplete: (jobId: string, isJoined: boolean) => void;
}): ColumnDef<ClientTrainingJob>[] {
  return [
    {
      id: "job",
      header: "Training job",
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex min-w-[180px] flex-col gap-1">
            <span className="font-medium text-foreground">{job.name}</span>
            <span
              className="max-w-[320px] truncate text-xs text-muted-foreground"
              title={job.description || undefined}
            >
              {job.description || "No description"}
            </span>
            <code className="text-[11px] text-muted-foreground" title={job.id}>
              {job.id}
            </code>
          </div>
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
      id: "updatedAt",
      header: "Updated",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: "participation",
      header: "Participation",
      cell: ({ row }) => (
        <ClientTrainingJobActions
          job={row.original}
          isJoined={
            userId ? row.original.participantUserIds.includes(userId) : false
          }
          isSessionReady={isSessionReady && Boolean(userId)}
          onActionComplete={handleActionComplete}
        />
      ),
    },
  ];
}
