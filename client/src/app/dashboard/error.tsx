"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Không thể tải dữ liệu huấn luyện</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Đã xảy ra lỗi khi tải các phiên huấn luyện và vòng cập nhật. Hãy thử
            tải lại dữ liệu.
          </p>
          <Button className="mt-5" onClick={reset}>
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
