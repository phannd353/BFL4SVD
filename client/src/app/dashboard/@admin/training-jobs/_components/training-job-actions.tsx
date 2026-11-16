"use client";

import { useState } from "react";
import { Ban, LoaderCircle, Pencil, Play, Square, Trash2 } from "lucide-react";
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
import {
  cancelTrainingJob,
  deleteTrainingJob,
  startTrainingJob,
} from "@/services/training-job.service";
import { EditTrainingJobDialog } from "./edit-training-job-dialog";
import { StopTrainingJobDialog } from "./stop-training-job-dialog";

interface TrainingJobActionsProps {
  job: TrainingJobResponseDto;
  onActionComplete: () => void;
}

export function TrainingJobActions({
  job,
  onActionComplete,
}: TrainingJobActionsProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStopOpen, setIsStopOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isRunning = job.status === "RUNNING";
  const canStart = job.status === "STOPPED";
  const canEdit = job.status === "DRAFT" && !job.publishedAt;
  const canCancel = job.status === "WAITING";

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startTrainingJob(job.id);
      toast.success("Training job started");
      onActionComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start training job",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelTrainingJob(job.id);
      toast.success("Training job cancelled");
      setIsCancelOpen(false);
      onActionComplete();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to cancel training job",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrainingJob(job.id);
      toast.success("Training job deleted");
      setIsDeleteOpen(false);
      onActionComplete();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete training job",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {canEdit && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Delete ${job.name}`}
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </>
        )}
        {canCancel && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsCancelOpen(true)}
          >
            <Ban className="size-3.5" />
            Cancel
          </Button>
        )}
        {isRunning && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setIsStopOpen(true)}
          >
            <Square className="size-3.5" />
            Stop
          </Button>
        )}
        {canStart && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isStarting}
            onClick={handleStart}
          >
            {isStarting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Resume
          </Button>
        )}
        {!canEdit && !canCancel && !isRunning && !canStart && (
          <span className="text-xs text-muted-foreground">No actions</span>
        )}
      </div>

      <EditTrainingJobDialog
        job={job}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={onActionComplete}
      />
      <StopTrainingJobDialog
        job={job}
        isOpen={isStopOpen}
        onClose={() => setIsStopOpen(false)}
        onSuccess={onActionComplete}
      />
      <Dialog
        open={isCancelOpen}
        onOpenChange={(open) => {
          if (!open && !isCancelling) setIsCancelOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel training job?</DialogTitle>
            <DialogDescription>
              “{job.name}” will no longer be available to participants. A
              started job cannot be cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isCancelling}
              onClick={() => setIsCancelOpen(false)}
            >
              Keep job
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isCancelling}
              onClick={handleCancel}
            >
              {isCancelling && <LoaderCircle className="size-4 animate-spin" />}
              {isCancelling ? "Cancelling..." : "Cancel job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setIsDeleteOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete training job?</DialogTitle>
            <DialogDescription>
              “{job.name}” can only be deleted before publication. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting && <LoaderCircle className="size-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
