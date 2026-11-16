import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Fingerprint,
  Fuel,
  Gauge,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getTrainingJobById,
  getTrainingJobParticipants,
  getTrainingJobRounds,
} from "@/services/training-job.service";
import type { JsonValueDto, TrainingJobResponseDto } from "@/types";
import { formatGasUsed } from "@/utils/gas.util";
import TrainingRoundsCard from "./_components/training-rounds-card";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export const metadata: Metadata = {
  title: "Training Job Details",
  description: "Training job statistics, rounds, and participants",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shorten(value: string) {
  return value.length > 28
    ? `${value.slice(0, 12)}…${value.slice(-10)}`
    : value;
}

function statusVariant(status: TrainingJobResponseDto["status"]) {
  switch (status) {
    case "FAILED":
      return "destructive" as const;
    case "CANCELLED":
      return "secondary" as const;
    case "RUNNING":
      return "default" as const;
    case "COMPLETED":
      return "default" as const;
    case "STOPPED":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default async function AdminTrainingJobDetailsPage({
  params,
}: PageProps) {
  const { jobId } = await params;
  const [{ data: job }, { data: rounds }, { data: participants }] =
    await Promise.all([
      getTrainingJobById(jobId),
      getTrainingJobRounds(jobId),
      getTrainingJobParticipants(jobId),
    ]);
  const progress =
    job.plannedRounds && job.plannedRounds > 0
      ? Math.min((job.currentRound / job.plannedRounds) * 100, 100)
      : 0;

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/training-jobs"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to training jobs
        </Link>

        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                {job.name}
              </h1>
              <Badge variant={statusVariant(job.status)}>
                {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
              </Badge>
            </div>
            <p className="max-w-3xl text-muted-foreground">
              {job.description || "No description provided."}
            </p>
            <code className="text-xs text-muted-foreground">{job.id}</code>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Created {formatDate(job.createdAt)}
          </p>
        </header>

        <section
          aria-label="Training job statistics"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardDescription>Status</CardDescription>
                <CardTitle className="text-xl">
                  {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
                </CardTitle>
              </div>
              <Activity className="size-5 text-primary" />
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Last updated {formatDate(job.updatedAt)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardDescription>Round progress</CardDescription>
                <CardTitle className="text-xl">
                  {job.currentRound}
                  {job.plannedRounds !== null ? ` / ${job.plannedRounds}` : ""}
                </CardTitle>
              </div>
              <Gauge className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              {job.plannedRounds ? (
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Training round progress"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No round target configured
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardDescription>Recorded rounds</CardDescription>
                <CardTitle className="text-xl">{rounds.length}</CardTitle>
              </div>
              <Fingerprint className="size-5 text-primary" />
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {rounds.filter((round) => round.metrics !== null).length} with
              recorded metrics
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardDescription>Active participants</CardDescription>
                <CardTitle className="text-xl">{participants.length}</CardTitle>
              </div>
              <UsersRound className="size-5 text-primary" />
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Currently joined clients
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardDescription>Total gas used</CardDescription>
                <CardTitle className="text-xl">
                  {formatGasUsed(job.gasUsed)}
                </CardTitle>
              </div>
              <Fuel className="size-5 text-primary" />
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Sum of mined transaction gas units
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 grid-cols-12">
          <Card className="col-span-6">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Training parameters</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Epochs</span>
                <span>{job.epochs ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Batch size</span>
                <span>{job.batchSize ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Learning rate</span>
                <span>{job.learningRate ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Publish time</span>
                <span className="text-right">{formatDate(job.publishAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Published</span>
                <span className="text-right">
                  {job.publishedAt ? formatDate(job.publishedAt) : "Scheduled"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Start time</span>
                <span className="text-right">
                  {job.startAt ? formatDate(job.startAt) : "Manual"}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-muted-foreground">
                  Initial model hash
                </span>
                <code
                  className="break-all text-xs"
                  title={job.initialModelHash}
                >
                  {job.initialModelHash}
                </code>
              </div>
              {job.finalModelHash && (
                <div className="grid gap-1">
                  <span className="text-muted-foreground">
                    Final model hash
                  </span>
                  <code
                    className="break-all text-xs"
                    title={job.finalModelHash}
                  >
                    {job.finalModelHash}
                  </code>
                </div>
              )}
              {job.stoppingReason && (
                <div className="grid gap-1 border-t pt-3">
                  <span className="text-muted-foreground">Stop reason</span>
                  <p className="break-words">{job.stoppingReason}</p>
                </div>
              )}
              {job.failureReason && (
                <div className="grid gap-1 border-t pt-3">
                  <span className="text-muted-foreground">Failure reason</span>
                  <p className="break-words">{job.failureReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-6">
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                Clients currently joined to this training job.
              </CardDescription>
            </CardHeader>
            {participants.length === 0 ? (
              <CardContent className="py-6 text-sm text-muted-foreground">
                No active participants.
              </CardContent>
            ) : (
              <CardContent className="space-y-4">
                {participants.map((participant) => (
                  <div
                    key={participant.user.id}
                    className="flex min-w-0 items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {participant.user.name || "Unnamed user"}
                      </p>
                      <code
                        className="text-xs text-muted-foreground"
                        title={participant.user.id}
                      >
                        {participant.user.id}
                      </code>
                    </div>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      Joined
                      <br />
                      {formatDate(participant.joinedAt)}
                    </span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          <Card className="min-w-0 col-span-12">
            <CardHeader>
              <CardTitle>Training rounds</CardTitle>
              <CardDescription>
                Round results, metrics, and model update references.
              </CardDescription>
            </CardHeader>
            {rounds.length === 0 ? (
              <CardContent className="py-8 text-sm text-muted-foreground">
                No rounds have been recorded for this job yet.
              </CardContent>
            ) : (
              <TrainingRoundsCard rounds={rounds} />
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
