"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TrainingJobResponseDto } from "@/types";
import { stopTrainingJob } from "@/services/training-job.service";

interface StopTrainingJobDialogProps {
  job: TrainingJobResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StopTrainingJobDialog({
  job,
  isOpen,
  onClose,
  onSuccess,
}: StopTrainingJobDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await stopTrainingJob(job.id, reason.trim());
      toast.success("Training job stopped");
      setReason("");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to stop training job",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop training job</DialogTitle>
          <DialogDescription>
            Provide the reason for stopping “{job.name}”. Participants will not
            be able to leave after training has started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor={`stop-reason-${job.id}`} className="text-sm font-medium">
              Stopping reason
            </label>
            <textarea
              id={`stop-reason-${job.id}`}
              className="min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || !reason.trim()}
            >
              {isLoading && <LoaderCircle className="size-4 animate-spin" />}
              {isLoading ? "Stopping..." : "Stop job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
