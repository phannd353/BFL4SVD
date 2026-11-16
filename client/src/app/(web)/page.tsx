import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Blocks,
  Braces,
  Check,
  Code2,
  Fingerprint,
  GitBranch,
  LockKeyhole,
  Network,
  ShieldCheck,
} from "lucide-react";

const workflow = [
  {
    number: "01",
    icon: Code2,
    title: "Huấn luyện tại chỗ",
    description:
      "Mỗi tổ chức đóng góp vào quá trình học từ kho mã của mình mà không cần tập trung mã nguồn về một nơi.",
  },
  {
    number: "02",
    icon: GitBranch,
    title: "Chia sẻ cập nhật mô hình",
    description:
      "Các client gửi cập nhật mô hình để cùng cải thiện khả năng nhận diện mẫu lỗ hổng phần mềm.",
  },
  {
    number: "03",
    icon: Fingerprint,
    title: "Ghi nhận trên blockchain",
    description:
      "Hash mô hình và thông tin cập nhật được ghi nhận trên FLRegistry, tạo dấu vết có thể kiểm chứng.",
  },
];

const principles = [
  {
    icon: LockKeyhole,
    title: "Dữ liệu ở đúng nơi",
    description:
      "Giảm nhu cầu chia sẻ tập dữ liệu nhạy cảm bằng cách đưa hoạt động học đến gần nơi dữ liệu được lưu trữ.",
  },
  {
    icon: ShieldCheck,
    title: "Cùng phát hiện rủi ro",
    description:
      "Kết hợp đóng góp từ nhiều tổ chức để hướng tới mô hình phát hiện lỗ hổng mạnh mẽ hơn.",
  },
  {
    icon: Blocks,
    title: "Có thể truy xuất",
    description:
      "Theo dõi hash và lịch sử cập nhật mô hình trên blockchain để hỗ trợ kiểm toán và xác minh nguồn gốc.",
  },
];

export default function HomePage() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BFL4SVD",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    description:
      "Nền tảng học liên kết dựa trên blockchain hỗ trợ phát hiện lỗ hổng phần mềm.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <main className="overflow-hidden">
        <section className="relative isolate border-b bg-background">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_25%,oklch(0.7_0.14_190/0.16),transparent_38%),radial-gradient(ellipse_at_15%_80%,oklch(0.7_0.12_260/0.1),transparent_35%)]" />
          <div className="container grid min-h-[680px] items-center gap-16 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-28">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
                <span className="size-2 rounded-full bg-emerald-500" />
                BFL4SVD
                <span className="text-border">/</span>
                Bảo mật phần mềm cộng tác
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                Phát hiện lỗ hổng.
                <span className="mt-2 block text-primary">
                  Cùng học, không gom dữ liệu.
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                BFL4SVD kết hợp học liên kết và blockchain để các tổ chức cùng
                xây dựng mô hình phát hiện lỗ hổng phần mềm, đồng thời duy trì
                khả năng truy xuất cho từng cập nhật mô hình.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  Tham gia mạng lưới <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border bg-background/70 px-6 font-medium transition-colors hover:bg-muted"
                >
                  Khám phá quy trình <ArrowDown className="size-4" />
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" />
                  Học liên kết
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" />
                  Dấu vết on-chain
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" />
                  Phát hiện lỗ hổng
                </span>
              </div>
            </div>

            <div
              aria-label="Sơ đồ client học liên kết và ghi nhận cập nhật lên blockchain"
              className="relative mx-auto w-full max-w-xl"
            >
              <div className="absolute inset-8 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative rounded-3xl border bg-card/90 p-5 shadow-2xl shadow-primary/10 backdrop-blur sm:p-7">
                <div className="flex items-center justify-between border-b pb-5">
                  <div>
                    <p className="text-sm font-semibold">
                      Luồng học liên kết (minh họa)
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Các tổ chức, một mục tiêu chung
                    </p>
                  </div>
                  <div className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                    Minh họa
                  </div>
                </div>

                <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-8 sm:gap-5">
                  <div className="space-y-3">
                    <ClientNode label="Tổ chức A" code="repo-a / local" />
                    <ClientNode label="Tổ chức B" code="repo-b / local" />
                    <ClientNode label="Tổ chức C" code="repo-c / local" />
                  </div>
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <div className="h-px w-6 bg-primary/40 sm:w-8" />
                    <Network className="size-7" />
                    <div className="h-px w-6 bg-primary/40 sm:w-8" />
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center">
                      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Braces className="size-5" />
                      </div>
                      <p className="text-sm font-semibold">Cập nhật mô hình</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Quy trình dự kiến
                      </p>
                    </div>
                    <div className="rounded-xl border bg-background p-3">
                      <div className="flex items-center gap-2">
                        <Blocks className="size-4 text-primary" />
                        <span className="text-xs font-semibold">
                          FLRegistry
                        </span>
                      </div>
                      <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                        hash ví dụ: 0x8a4f...c21d
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Ví dụ bản ghi
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-muted/70 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Mã nguồn được lưu tại tổ chức
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    VÍ DỤ
                  </span>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Minh họa quy trình — không hiển thị dữ liệu hoặc thông tin thật.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-28" id="approach">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Bảo mật bằng cộng tác
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Nhiều nguồn tri thức. Một mô hình an toàn hơn.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Dữ liệu bảo mật thường khó chia sẻ và khó kết hợp. Học liên kết
              tạo một hướng tiếp cận cộng tác; blockchain bổ sung khả năng kiểm
              chứng nguồn gốc các cập nhật mô hình.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className="group rounded-2xl border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <p className="mt-7 text-sm font-medium text-muted-foreground">
                  0{index + 1}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y bg-muted py-20 sm:py-28" id="how-it-works">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center text-muted-foreground">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Quy trình
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Từ dữ liệu cục bộ đến dấu vết có thể kiểm chứng
              </h2>
              <p className="mt-5 text-lg leading-8">
                Mỗi bên tham gia đóng góp vào quá trình học mà không cần đưa kho
                mã nguồn của mình vào một kho dữ liệu tập trung.
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-3">
              {workflow.map(
                ({ number, icon: Icon, title, description }, index) => (
                  <article
                    key={number}
                    className="relative rounded-2xl border bg-card p-7 shadow-sm"
                  >
                    {index < workflow.length - 1 && (
                      <ArrowRight className="absolute -right-4 top-12 z-10 hidden size-7 rounded-full border bg-background p-1 text-muted-foreground lg:block" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-muted-foreground">
                        {number}
                      </span>
                      <Icon className="size-5 text-primary" />
                    </div>
                    <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 leading-7 text-foreground/70">
                      {description}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-28">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-primary-foreground sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-primary-foreground/10" />
            <div className="pointer-events-none absolute -right-4 -top-12 size-56 rounded-full border border-primary-foreground/10" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
                  BFL4SVD
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Cùng xây dựng tương lai an toàn hơn cho phần mềm.
                </h2>
                <p className="mt-4 max-w-xl leading-7 text-primary-foreground/75">
                  Tham gia mạng lưới và khám phá cách học liên kết có thể hỗ trợ
                  phát hiện lỗ hổng mà vẫn tôn trọng ranh giới dữ liệu.
                </p>
              </div>
              <Link
                href="/auth/sign-up"
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-background px-6 font-medium text-foreground transition-opacity hover:opacity-90"
              >
                Tạo tài khoản <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function ClientNode({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-primary">
          <Code2 className="size-3.5" />
        </div>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
        {code}
      </p>
    </div>
  );
}
