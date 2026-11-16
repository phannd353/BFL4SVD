import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  JsonValueDto,
  TrainingJobResponseDto,
  TrainingJobRoundResponseDto,
} from "@/types";
import { formatGasUsed } from "@/utils/gas.util";

export const metadata: Metadata = {
  title: "Training Rounds",
  description: "Detailed training round results and client model updates",
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shorten(value: string) {
  return value.length > 32
    ? `${value.slice(0, 16)}…${value.slice(-12)}`
    : value;
}

function getMetrics(metrics: JsonValueDto | null): [string, string][] {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return [];
  }
  return Object.entries(metrics).map(([name, value]) => [
    name,
    value !== null && typeof value === "object"
      ? JSON.stringify(value)
      : String(value),
  ]);
}

function formatLearningRate(value: string) {
  const scaledValue = Number(value);
  return Number.isFinite(scaledValue)
    ? (scaledValue / 1_000_000).toLocaleString(undefined, {
        maximumSignificantDigits: 6,
      })
    : value;
}

function roundStatusVariant(status: TrainingJobRoundResponseDto["status"]) {
  switch (status) {
    case "COMPLETED":
      return "default" as const;
    case "STOPPED":
      return "secondary" as const;
    case "RUNNING":
      return "outline" as const;
  }
}

function jobStatusVariant(status: TrainingJobResponseDto["status"]) {
  switch (status) {
    case "FAILED":
      return "destructive" as const;
    case "CANCELLED":
    case "STOPPED":
      return "secondary" as const;
    case "RUNNING":
    case "COMPLETED":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

export function JobRoundsDetailCard({
  rounds,
}: {
  rounds: TrainingJobRoundResponseDto[];
}) {
  return rounds.map((round) => {
    const metrics = getMetrics(round.metrics);
    return (
      <article
        key={round.id}
        className="rounded-lg border bg-card p-4 sm:p-5 bg-muted"
        aria-labelledby={`round-${round.id}-title`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={`round-${round.id}-title`} className="font-semibold">
                Round {round.roundNumber}
              </h2>
              <Badge variant={roundStatusVariant(round.status)}>
                {round.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Started {formatDate(round.startedAt)}
              {round.completedAt
                ? ` · Completed ${formatDate(round.completedAt)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <p>
              {round.modelUpdates.length} client{" "}
              {round.modelUpdates.length === 1 ? "update" : "updates"}
            </p>
            <p title={round.gasUsed ?? undefined}>
              Gas used: {formatGasUsed(round.gasUsed)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Aggregate metrics</h3>
            {metrics.length ? (
              <div className="flex flex-wrap gap-2">
                {metrics.map(([name, value]) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="max-w-full whitespace-normal break-all font-normal"
                  >
                    {name}: {value}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No aggregate metrics recorded.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Aggregated model</h3>
            {round.aggregatedModelHash ? (
              <code
                className="block break-all text-xs text-muted-foreground"
                title={round.aggregatedModelHash}
              >
                {round.aggregatedModelHash}
              </code>
            ) : (
              <p className="text-sm text-muted-foreground">
                No aggregated model recorded.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-medium">Client model updates</h3>
          {round.modelUpdates.length === 0 ? (
            <p className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
              No client updates recorded for this round.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Accuracy / score</TableHead>
                    <TableHead>Training config</TableHead>
                    <TableHead>Model lineage</TableHead>
                    <TableHead>Update metrics</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {round.modelUpdates.map((update) => {
                    const updateMetrics = getMetrics(update.metrics);
                    return (
                      <TableRow key={update.id}>
                        <TableCell className="min-w-40 align-top">
                          <code
                            className="text-xs"
                            title={update.clientAddress}
                          >
                            {shorten(update.clientAddress)}
                          </code>
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-top text-xs">
                          <div>Accuracy: {update.accuracy}%</div>
                          <div className="text-muted-foreground">
                            Score: {update.score}%
                          </div>
                        </TableCell>
                        <TableCell className="min-w-36 align-top text-xs">
                          <div>Epochs: {update.epoch}</div>
                          <div>Batch size: {update.batchSize}</div>
                          <div className="text-muted-foreground">
                            LR: {formatLearningRate(update.learningRate)}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-56 align-top">
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Model:{" "}
                              </span>
                              <code
                                className="break-all"
                                title={update.modelHash}
                              >
                                {update.modelHash}
                              </code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Previous:{" "}
                              </span>
                              <code
                                className="break-all"
                                title={update.prevModelHash}
                              >
                                {update.prevModelHash}
                              </code>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-48 align-top">
                          {updateMetrics.length ? (
                            <dl className="space-y-1 text-xs">
                              {updateMetrics.map(([name, value]) => (
                                <div key={name} className="break-all">
                                  <dt className="inline font-medium">
                                    {name}:{" "}
                                  </dt>
                                  <dd className="inline text-muted-foreground">
                                    {value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No metrics
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-36 whitespace-nowrap align-top text-xs text-muted-foreground">
                          {formatDate(update.timestamp)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </article>
    );
  });
}
