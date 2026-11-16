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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "./date-time-picker";
import type { CreateTrainingJobRequestDto } from "@/types";
import { createTrainingJob } from "@/services/training-job.service";

interface CreateTrainingJobDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function localDateTimeValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function createEmptyForm() {
  const publishTime = new Date(Date.now() + 5 * 60_000);
  publishTime.setSeconds(0, 0);
  const startTime = new Date(publishTime.getTime() + 60 * 60_000);
  return {
    name: "",
    description: "",
    plannedRounds: "30",
    epochs: "10",
    batchSize: "32",
    learningRate: "0.001",
    initialModelHash: "",
    publishAt: localDateTimeValue(publishTime),
    startAt: localDateTimeValue(startTime),
  };
}

export function CreateTrainingJobDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateTrainingJobDialogProps) {
  const [form, setForm] = useState(createEmptyForm);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: CreateTrainingJobRequestDto = {
      name: form.name.trim(),
      publishAt: new Date(form.publishAt).toISOString(),
      startAt: new Date(form.startAt).toISOString(),
      initialModelHash: form.initialModelHash.trim(),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : {}),
      ...(form.plannedRounds
        ? { plannedRounds: Number(form.plannedRounds) }
        : {}),
      ...(form.epochs ? { epochs: Number(form.epochs) } : {}),
      ...(form.batchSize ? { batchSize: Number(form.batchSize) } : {}),
      ...(form.learningRate !== ""
        ? { learningRate: Number(form.learningRate) }
        : {}),
    };

    setIsLoading(true);
    try {
      await createTrainingJob(payload);
      toast.success("Training job created");
      setForm(createEmptyForm());
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create training job",
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
          <DialogTitle>Create training job</DialogTitle>
          <DialogDescription>
            Configure a federated learning job. Set an initial model and
            schedule for this training job.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="training-job-name">Name</Label>
            <Input
              id="training-job-name"
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
            <Label htmlFor="training-job-description">Description</Label>
            <Input
              id="training-job-description"
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
            <Label htmlFor="training-job-publish-at">Publish time</Label>
            <DateTimePicker
              id="training-job-publish-at"
              value={form.publishAt}
              min={localDateTimeValue(new Date(Date.now() + 60_000))}
              onChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  publishAt: value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="training-job-start-at">Start time</Label>
            <DateTimePicker
              id="training-job-start-at"
              value={form.startAt}
              min={localDateTimeValue(
                new Date(new Date(form.publishAt).getTime() + 60_000),
              )}
              onChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  startAt: value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="training-job-rounds">Planned rounds</Label>
            <Input
              id="training-job-rounds"
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
            <Label htmlFor="training-job-epochs">Epochs</Label>
            <Input
              id="training-job-epochs"
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
            <Label htmlFor="training-job-batch-size">Batch size</Label>
            <Input
              id="training-job-batch-size"
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
            <Label htmlFor="training-job-learning-rate">Learning rate</Label>
            <Input
              id="training-job-learning-rate"
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
            <Label htmlFor="training-job-model-hash">Initial model hash</Label>
            <Input
              id="training-job-model-hash"
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
              {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isLoading ? "Creating..." : "Create job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
