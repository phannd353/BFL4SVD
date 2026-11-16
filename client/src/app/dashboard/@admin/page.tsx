import { Blocks, Boxes, Fingerprint, Gauge, UsersRound } from "lucide-react";

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
import type { ModelResponseDto, TrainingJobResponseDto } from "@/types";
import { getModels } from "@/services/model.service";
import {
  getTrainingJobRounds,
  getTrainingJobs,
} from "@/services/training-job.service";

async function getAdminData() {
  const [modelsResponse, jobsResponse] = await Promise.all([
    getModels(),
    getTrainingJobs(),
  ]);
  const models: ModelResponseDto[] = modelsResponse.data;
  const jobs: TrainingJobResponseDto[] = jobsResponse.data;

  const jobsWithRounds = await Promise.all(
    jobs.map(async (job) => ({
      job,
      rounds: (await getTrainingJobRounds(job.id)).data,
    })),
  );

  return { models, jobsWithRounds };
}

function formatDate(value: string | number, seconds = false) {
  const date = new Date(seconds ? Number(value) * 1000 : value);
  if (Number.isNaN(date.getTime())) return "Không xác định";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shorten(value: string, start = 10, end = 6) {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
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
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean",
    )
    .slice(0, 4)
    .map(([key, value]) => [key, String(value)]);
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
    case "DRAFT":
      return "Bản nháp";
    default:
      return "Không xác định";
  }
}

export default async function AdminPage() {
  const { models, jobsWithRounds } = await getAdminData();
  const totalRounds = jobsWithRounds.reduce(
    (sum, { rounds }) => sum + rounds.length,
    0,
  );
  const jobsRunning = jobsWithRounds.filter(
    ({ job }) => job.status === "RUNNING",
  ).length;

  const overview = [
    { title: "Mô hình on-chain", value: models.length, icon: Boxes },
    // { title: "Client đăng ký", value: clients.length, icon: UsersRound },
    {
      title: "Training rounds",
      value: totalRounds,
      icon: Gauge,
      detail: `${jobsRunning} phiên đang chạy`,
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Blocks className="size-4" />
            BFL4SVD · Quản trị
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Tổng quan hệ thống
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Theo dõi mô hình đã ghi nhận trên FLRegistry, client tham gia và
            tiến độ các vòng huấn luyện.
          </p>
        </header>

        <section
          aria-label="Tổng quan hệ thống"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {overview.map(({ title, value, icon: Icon, detail }) => (
            <Card key={title}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardDescription>{title}</CardDescription>
                  <CardTitle className="text-3xl">{value}</CardTitle>
                </div>
                <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {detail ?? "Tổng số hiện được ghi nhận"}
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-labelledby="models-heading" className="space-y-4">
          <div>
            <h2 id="models-heading" className="text-xl font-semibold">
              Mô hình
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các mô hình được lưu trong hệ thống cùng hash và kích thước.
            </p>
          </div>
          <Card>
            {models.length === 0 ? (
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Chưa có mô hình nào được ghi nhận.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model hash</TableHead>
                    <TableHead>Size (bytes)</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.hash}>
                      <TableCell>
                        <code className="text-xs" title={model.hash}>
                          {shorten(model.hash, 12, 8)}
                        </code>
                      </TableCell>
                      <TableCell>{model.size}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(model.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </section>

        <section aria-labelledby="clients-heading" className="space-y-4">
          <div>
            <h2 id="clients-heading" className="text-xl font-semibold">
              Client
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tài khoản đã đăng ký làm client trong hệ thống.
            </p>
          </div>
          {/*<Card>
            {clients.length === 0 ? (
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Chưa có client đăng ký.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Ngày đăng ký</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.user.name}
                      </TableCell>
                      <TableCell>
                        {client.walletAddress ? (
                          <code
                            className="text-xs"
                            title={client.walletAddress}
                          >
                            {shorten(client.walletAddress)}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">
                            Chưa liên kết
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs" title={client.id}>
                          {shorten(client.id)}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(client.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>*/}
        </section>

        <section aria-labelledby="rounds-heading" className="space-y-4">
          <div>
            <h2 id="rounds-heading" className="text-xl font-semibold">
              Training jobs &amp; rounds
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Xem trạng thái từng phiên cùng metrics và dấu vết cập nhật của
              từng vòng.
            </p>
          </div>

          {jobsWithRounds.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Chưa có training job.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {jobsWithRounds.map(({ job, rounds }) => (
                <Card key={job.id}>
                  <CardHeader className="gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
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
                        {job.description || "Không có mô tả"}
                      </CardDescription>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="font-medium">
                        Round {job.currentRound}
                        {job.plannedRounds ? ` / ${job.plannedRounds}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Cập nhật {formatDate(job.updatedAt)}
                      </p>
                    </div>
                  </CardHeader>

                  {rounds.length === 0 ? (
                    <CardContent className="py-7 text-sm text-muted-foreground">
                      Chưa có round nào được ghi nhận.
                    </CardContent>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Round</TableHead>
                          <TableHead>Metrics</TableHead>
                          <TableHead>Model hash</TableHead>
                          <TableHead>Client updates</TableHead>
                          <TableHead>Thời gian</TableHead>
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
                              <TableCell>
                                {metrics.length ? (
                                  <div className="flex max-w-sm flex-wrap gap-1">
                                    {metrics.map(([name, value]) => (
                                      <Badge
                                        key={name}
                                        variant="outline"
                                        className="font-normal"
                                      >
                                        {name}: {value}
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
                                    {shorten(round.aggregatedModelHash, 12, 8)}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{round.modelUpdates.length}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(round.createdAt)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
