"use client";

import { SubmitEventHandler, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "./date-time-picker";
import type {
  TrainingJobResponseDto,
  UpdateTrainingJobRequestDto,
} from "@/types";
import { updateTrainingJob } from "@/services/training-job.service";

interface EditTrainingJobDialogProps {
  job: TrainingJobResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function afterMinute(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : toLocalDateTime(new Date(date.getTime() + 60_000).toISOString());
}

export function EditTrainingJobDialog({
  job,
  isOpen,
  onClose,
  onSuccess,
}: EditTrainingJobDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState(() => ({
    name: job.name,
    description: job.description || "",
    publishAt: toLocalDateTime(job.publishAt),
    startAt: toLocalDateTime(job.startAt || ""),
    plannedRounds: job.plannedRounds?.toString() || "30",
    epochs: job.epochs?.toString() || "10",
    batchSize: job.batchSize?.toString() || "32",
    learningRate: job.learningRate?.toString() || "0.001",
    initialModelHash: job.initialModelHash,
  }));

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: job.name,
      description: job.description || "",
      publishAt: toLocalDateTime(job.publishAt),
      startAt: toLocalDateTime(job.startAt || ""),
      plannedRounds: job.plannedRounds?.toString() || "30",
      epochs: job.epochs?.toString() || "10",
      batchSize: job.batchSize?.toString() || "32",
      learningRate: job.learningRate?.toString() || "0.001",
      initialModelHash: job.initialModelHash,
    });
  }, [isOpen, job]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const payload: UpdateTrainingJobRequestDto = {
      name: form.name.trim(),
      description: form.description.trim(),
      publishAt: new Date(form.publishAt).toISOString(),
      startAt: new Date(form.startAt).toISOString(),
      ...(form.plannedRounds
        ? { plannedRounds: Number(form.plannedRounds) }
        : {}),
      ...(form.epochs ? { epochs: Number(form.epochs) } : {}),
      ...(form.batchSize ? { batchSize: Number(form.batchSize) } : {}),
      ...(form.learningRate !== ""
        ? { learningRate: Number(form.learningRate) }
        : {}),
      ...(form.initialModelHash.trim()
        ? { initialModelHash: form.initialModelHash.trim() }
        : {}),
    };

    setIsLoading(true);
    try {
      await updateTrainingJob(job.id, payload);
      toast.success("Training job updated");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update training job",
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit training job</DialogTitle>
          <DialogDescription>
            Configuration and schedule can only be changed before publication.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-name-${job.id}`}>Name</Label>
            <Input
              id={`edit-job-name-${job.id}`}
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              maxLength={120}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-description-${job.id}`}>
              Description
            </Label>
            <Input
              id={`edit-job-description-${job.id}`}
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              maxLength={1000}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-publish-${job.id}`}>Publish time</Label>
            <DateTimePicker
              id={`edit-job-publish-${job.id}`}
              value={form.publishAt}
              min={toLocalDateTime(new Date(Date.now() + 60_000).toISOString())}
              onChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  publishAt: value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-start-${job.id}`}>Start time</Label>
            <DateTimePicker
              id={`edit-job-start-${job.id}`}
              value={form.startAt}
              min={afterMinute(form.publishAt)}
              onChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  startAt: value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-rounds-${job.id}`}>Planned rounds</Label>
            <Input
              id={`edit-job-rounds-${job.id}`}
              type="number"
              min="1"
              step="1"
              value={form.plannedRounds}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  plannedRounds: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-epochs-${job.id}`}>Epochs</Label>
            <Input
              id={`edit-job-epochs-${job.id}`}
              type="number"
              min="1"
              step="1"
              value={form.epochs}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  epochs: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-batch-${job.id}`}>Batch size</Label>
            <Input
              id={`edit-job-batch-${job.id}`}
              type="number"
              min="1"
              step="1"
              value={form.batchSize}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  batchSize: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-rate-${job.id}`}>Learning rate</Label>
            <Input
              id={`edit-job-rate-${job.id}`}
              type="number"
              min="0"
              max="1"
              step="any"
              value={form.learningRate}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  learningRate: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-job-model-${job.id}`}>
              Initial model hash
            </Label>
            <Input
              id={`edit-job-model-${job.id}`}
              value={form.initialModelHash}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  initialModelHash: event.target.value,
                }))
              }
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
            <Button type="submit" disabled={isLoading || !form.name.trim()}>
              {isLoading && <LoaderCircle className="size-4 animate-spin" />}
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
