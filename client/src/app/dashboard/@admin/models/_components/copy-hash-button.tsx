"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyHashButton({ hash }: { hash: string }) {
  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success("Model hash copied");
    } catch {
      toast.error("Unable to copy model hash. Select and copy it manually.");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Copy model hash"
      title="Copy model hash"
      onClick={copyHash}
    >
      <Copy />
    </Button>
  );
}
