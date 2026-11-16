"use client";

import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import "@/styles/globals.css";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SharedError = ({ error }: { error: Error & { digest?: string } }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-muted/10 to-background p-4">
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-100/[0.03] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <Card className="relative z-10 w-full max-w-lg border-destructive/20 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
            <AlertTriangle className="h-10 w-10 text-destructive animate-pulse" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Đã xảy ra lỗi
            </CardTitle>
            <CardDescription className="text-base">
              Xin lỗi, có vấn đề đã xảy ra khi tải trang này
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 border border-muted">
            <p className="text-sm text-muted-foreground break-all">
              {error.message || "Lỗi không xác định"}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground/60">
                ID: {error.digest}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Bạn có thể thử:</p>
            <ul className="list-inside list-disc space-y-1 ml-2">
              <li>Tải lại trang</li>
              <li>Quay về trang chủ</li>
              <li>Liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button onClick={router.refresh} className="flex-1 gap-2" size="lg">
            <RefreshCcw className="h-4 w-4" />
            Thử lại
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            size="lg"
          >
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Trang chủ
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </div>
  );
};

export default SharedError;
