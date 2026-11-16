import {
  Activity,
  Blocks,
  Clock3,
  Fingerprint,
  Layers3,
  Waypoints,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  TrainingJobResponseDto,
  TrainingJobRoundResponseDto,
} from "@/types";
import {
  getTrainingJobRounds,
  getTrainingJobs,
} from "@/services/training-job.service";

async function getTrainingData(): Promise<
  { job: TrainingJobResponseDto; rounds: TrainingJobRoundResponseDto[] }[]
> {
  const { data: jobs } = await getTrainingJobs();

  return Promise.all(
    jobs
      .filter((job) => job.status !== "DRAFT")
      .map(async (job) => ({
        job,
        rounds: (await getTrainingJobRounds(job.id)).data,
      })),
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shorten(value: string) {
  return value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

function getMetrics(metrics: unknown): [string, string][] {
  if (
    metrics === null ||
    typeof metrics !== "object" ||
    Array.isArray(metrics)
  ) {
    return [];
  }

  return Object.entries(metrics)
    .filter(
      ([, value]) =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean",
    )
    .slice(0, 4)
    .map(([key, value]) => [
      key,
      typeof value === "number"
        ? new Intl.NumberFormat("vi-VN", {
            maximumSignificantDigits: 4,
          }).format(value)
        : String(value),
    ]);
}

function statusLabel(status: TrainingJobResponseDto["status"]) {
  switch (status) {
    case "RUNNING":
      return "Đang chạy";
    case "COMPLETED":
      return "Hoàn tất";
    case "STOPPED":
      return "Đã dừng";
    case "CANCELLED":
      return "Đã hủy";
    case "FAILED":
      return "Thất bại";
    case "WAITING":
      return "Chờ bắt đầu";
    default:
      return "Không xác định";
  }
}

export default async function DashboardPage() {
  const jobs = await getTrainingData();
  const totalRounds = jobs.reduce(
    (count, item) => count + item.rounds.length,
    0,
  );
  const activeJobs = jobs.filter(({ job }) => job.status === "RUNNING").length;

  const summary = [
    {
      label: "Training job",
      value: jobs.length,
      icon: Layers3,
      detail: "Tổng số phiên huấn luyện",
    },
    {
      label: "Vòng đã ghi nhận",
      value: totalRounds,
      icon: Activity,
      detail: "Dữ liệu vòng huấn luyện",
    },
    {
      label: "Đang hoạt động",
      value: activeJobs,
      icon: Waypoints,
      detail: "Phiên đang ở trạng thái chạy",
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Blocks className="size-4" />
              BFL4SVD
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bảng điều khiển huấn luyện
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Theo dõi tiến độ các phiên học liên kết, kết quả từng vòng và dấu
              vết cập nhật mô hình.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1">
            <Fingerprint className="size-3.5" />
            Theo dõi cập nhật on-chain
          </Badge>
        </header>

        <section
          aria-label="Tổng quan huấn luyện"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {summary.map(({ label, value, icon: Icon, detail }) => (
            <Card key={label}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-3xl">{value}</CardTitle>
                </div>
                <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {detail}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-5" aria-labelledby="rounds-heading">
          <div>
            <h2 id="rounds-heading" className="text-xl font-semibold">
              Các vòng huấn luyện
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mỗi vòng hiển thị chỉ số được lưu cùng phiên và mã tham chiếu
              blockchain nếu có.
            </p>
          </div>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                <span className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
                  <Clock3 className="size-6" />
                </span>
                <h3 className="font-semibold">Chưa có phiên huấn luyện</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Khi có training job, tiến độ và các vòng huấn luyện sẽ xuất
                  hiện tại đây.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {jobs.map(({ job, rounds }) => {
                const plannedRounds = job.plannedRounds ?? 0;
                const progress =
                  plannedRounds > 0
                    ? Math.min((job.currentRound / plannedRounds) * 100, 100)
                    : 0;

                return (
                  <Card key={job.id}>
                    <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg">{job.name}</CardTitle>
                          <Badge
                            variant={
                              job.status === "RUNNING" ? "default" : "secondary"
                            }
                          >
                            {statusLabel(job.status)}
                          </Badge>
                        </div>
                        <CardDescription>
                          {job.description || "Chưa có mô tả"}
                        </CardDescription>
                      </div>
                      <div className="min-w-40 text-sm sm:text-right">
                        <p className="font-medium">
                          Vòng {job.currentRound}
                          {job.plannedRounds ? ` / ${job.plannedRounds}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cập nhật {formatDate(job.updatedAt)}
                        </p>
                      </div>
                    </CardHeader>

                    {plannedRounds > 0 && (
                      <div
                        className="h-1.5 bg-muted"
                        role="progressbar"
                        aria-label={`Tiến độ ${job.name}`}
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full bg-primary transition-[width]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    {rounds.length === 0 ? (
                      <CardContent className="py-8 text-sm text-muted-foreground">
                        Chưa có vòng huấn luyện nào được ghi nhận.
                      </CardContent>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vòng</TableHead>
                            <TableHead>Thời gian</TableHead>
                            <TableHead>Metrics</TableHead>
                            <TableHead>Model hash</TableHead>
                            <TableHead>Client updates</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rounds.map((round) => {
                            const metrics = getMetrics(round.metrics);

                            return (
                              <TableRow key={round.id}>
                                <TableCell className="font-medium">
                                  #{round.roundNumber}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(round.createdAt)}
                                </TableCell>
                                <TableCell>
                                  {metrics.length > 0 ? (
                                    <div className="flex max-w-sm flex-wrap gap-1.5">
                                      {metrics.map(([key, value]) => (
                                        <Badge
                                          key={key}
                                          variant="outline"
                                          className="font-normal"
                                        >
                                          {key}: {value}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Chưa có
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {round.aggregatedModelHash ? (
                                    <code
                                      className="text-xs"
                                      title={round.aggregatedModelHash}
                                    >
                                      {shorten(round.aggregatedModelHash)}
                                    </code>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {round.modelUpdates.length}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
