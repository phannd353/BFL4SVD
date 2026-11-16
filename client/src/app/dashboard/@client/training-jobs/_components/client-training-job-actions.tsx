"use client";

import { useState } from "react";
import { LoaderCircle, LogIn, LogOut, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TrainingJobResponseDto } from "@/types";
import {
  joinTrainingJob,
  leaveTrainingJob,
} from "@/services/training-job.service";
import { JoinCommandDialog } from "./join-command-dialog";

interface ClientTrainingJobActionsProps {
  job: TrainingJobResponseDto;
  isJoined: boolean;
  isSessionReady: boolean;
  onActionComplete: (jobId: string, isJoined: boolean) => void;
}

export function ClientTrainingJobActions({
  job,
  isJoined,
  isSessionReady,
  onActionComplete,
}: ClientTrainingJobActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const now = Date.now();
  const isPublished =
    job.publishedAt !== null && new Date(job.publishedAt).getTime() <= now;
  const hasStarted =
    Boolean(job.startedAt) ||
    job.status === "RUNNING" ||
    Boolean(job.startAt && new Date(job.startAt).getTime() <= now);
  const canJoin = job.status === "WAITING" && isPublished && !hasStarted;
  const canLeave = isJoined && job.status === "WAITING" && !hasStarted;
  // A joined participant needs the command to connect a SuperNode before the
  // run starts, and may still connect while it is running.
  const canShowCommand =
    isJoined && (job.status === "WAITING" || job.status === "RUNNING");

  const handleParticipation = async () => {
    setIsLoading(true);
    try {
      if (canLeave) {
        await leaveTrainingJob(job.id);
        toast.success("You left the training job");
        setIsCommandOpen(false);
      } else {
        await joinTrainingJob(job.id);
        toast.success("You joined the training job");
        setIsCommandOpen(true);
      }
      onActionComplete(job.id, !isJoined);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update your participation",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const participation =
    canLeave || canJoin ? (
      <Button
        type="button"
        size="sm"
        variant={canLeave ? "outline" : "default"}
        disabled={!isSessionReady || isLoading}
        onClick={handleParticipation}
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : canLeave ? (
          <LogOut className="h-4 w-4" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {canLeave ? "Leave" : "Join"}
      </Button>
    ) : (
      <span className="text-xs text-muted-foreground">
        {job.status === "CANCELLED"
          ? "Cancelled"
          : job.status === "FAILED"
            ? "Failed"
            : isJoined
              ? "Joined · locked"
              : isPublished
                ? "Closed"
                : "Not published"}
      </span>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {participation}
      {canShowCommand && (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!isSessionReady}
            onClick={() => setIsCommandOpen(true)}
          >
            <Terminal className="h-4 w-4" />
            Join command
          </Button>
          <JoinCommandDialog
            job={job}
            isOpen={isCommandOpen}
            onClose={() => setIsCommandOpen(false)}
          />
        </>
      )}
    </div>
  );
}
