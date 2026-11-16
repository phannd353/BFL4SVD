import type { Metadata } from "next";
import Link from "next/link";
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
import { getModels } from "@/services/model.service";
import {
  getTrainingJobRounds,
  getTrainingJobs,
} from "@/services/training-job.service";
import type { TrainingJobResponseDto } from "@/types";
import { CopyHashButton } from "./_components/copy-hash-button";

type ModelSource =
  | {
      kind: "round";
      jobId: string;
      jobName: string;
      roundNumber: number;
    }
  | { kind: "final"; jobId: string; jobName: string };

type TrainingJobReference = { jobId: string; jobName: string };

export const metadata: Metadata = {
  title: "Models",
  description: "Models and their training job sources",
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

function addSource(
  sources: Map<string, ModelSource[]>,
  modelHash: string,
  source: ModelSource,
) {
  const modelSources = sources.get(modelHash) ?? [];
  modelSources.push(source);
  sources.set(modelHash, modelSources);
}

function addUsage(
  usages: Map<string, TrainingJobReference[]>,
  modelHash: string,
  job: TrainingJobReference,
) {
  const modelUsages = usages.get(modelHash) ?? [];
  modelUsages.push(job);
  usages.set(modelHash, modelUsages);
}

function getSourceLabel(source: ModelSource) {
  switch (source.kind) {
    case "round":
      return `Round ${source.roundNumber} aggregate · ${source.jobName}`;
    case "final":
      return `Finalized job · ${source.jobName}`;
  }
}

function sourceVariant(source: ModelSource) {
  return source.kind === "final" ? "default" : "outline";
}

export default async function AdminModelsPage() {
  const [{ data: models }, { data: jobs }] = await Promise.all([
    getModels(),
    getTrainingJobs(),
  ]);
  const jobsWithRounds = await Promise.all(
    jobs.map(async (job: TrainingJobResponseDto) => ({
      job,
      rounds: (await getTrainingJobRounds(job.id)).data,
    })),
  );
  const sources = new Map<string, ModelSource[]>();
  const usages = new Map<string, TrainingJobReference[]>();

  for (const { job, rounds } of jobsWithRounds) {
    addUsage(usages, job.initialModelHash, {
      jobId: job.id,
      jobName: job.name,
    });
    if (job.finalModelHash) {
      addSource(sources, job.finalModelHash, {
        kind: "final",
        jobId: job.id,
        jobName: job.name,
      });
    }
    for (const round of rounds) {
      if (round.aggregatedModelHash) {
        addSource(sources, round.aggregatedModelHash, {
          kind: "round",
          jobId: job.id,
          jobName: job.name,
          roundNumber: round.roundNumber,
        });
      }
    }
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stored models and the rounds or jobs that produced them.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Model registry</CardTitle>
          <CardDescription>
            Model provenance and jobs that use each model as their initial model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No models have been recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model hash</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Used in</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => {
                    const modelSources = sources.get(model.hash) ?? [];
                    const modelUsages = usages.get(model.hash) ?? [];
                    return (
                      <TableRow key={model.hash}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs" title={model.hash}>
                              {shorten(model.hash)}
                            </code>
                            <CopyHashButton hash={model.hash} />
                          </div>
                        </TableCell>
                        <TableCell>
                          {model.size.toLocaleString()} bytes
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {modelSources.length > 0 ? (
                              modelSources.map((source) => (
                                <Link
                                  key={`${source.kind}-${source.jobId}-${source.kind === "round" ? source.roundNumber : ""}`}
                                  href={`/dashboard/training-jobs/${encodeURIComponent(source.jobId)}`}
                                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Badge variant={sourceVariant(source)}>
                                    {getSourceLabel(source)}
                                  </Badge>
                                </Link>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {modelUsages.length > 0 ? (
                              modelUsages.map((job) => (
                                <Link
                                  key={job.jobId}
                                  href={`/dashboard/training-jobs/${encodeURIComponent(job.jobId)}`}
                                  className="text-sm text-primary underline-offset-4 hover:underline"
                                >
                                  {job.jobName}
                                </Link>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(model.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}