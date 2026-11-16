"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Copy, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTrainingJobJoinConfig } from "@/services/training-job.service";
import type {
  TrainingJobJoinConfigResponseDto,
  TrainingJobResponseDto,
} from "@/types";
import {
  buildJoinCommands,
  validateDatasetDir,
  validatePort,
} from "@/utils/fl-join-command.util";

interface JoinCommandDialogProps {
  job: TrainingJobResponseDto;
  isOpen: boolean;
  onClose: () => void;
}

export function JoinCommandDialog({
  job,
  isOpen,
  onClose,
}: JoinCommandDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Connect your Flower client</DialogTitle>
          <DialogDescription>
            Run these two Docker commands on the machine that holds your dataset
            to take part in “{job.name}”.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: every open issues a fresh token and the
            token is dropped from memory when the dialog closes. */}
        {isOpen && <JoinCommandPanel jobId={job.id} />}
      </DialogContent>
    </Dialog>
  );
}

function JoinCommandPanel({ jobId }: { jobId: string }) {
  const [config, setConfig] = useState<TrainingJobJoinConfigResponseDto | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [port, setPort] = useState("");
  const [datasetDir, setDatasetDir] = useState("/data");
  const [revealToken, setRevealToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTrainingJobJoinConfig(jobId)
      .then(({ data }) => {
        if (cancelled) return;
        setConfig(data);
        setPort((current) => current || String(data.defaultSupernodePort));
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error && error.message
            ? error.message
            : "Unable to load the join command.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, attempt]);

  const result = useMemo(
    () => (config ? buildJoinCommands(config, { port, datasetDir }) : null),
    [config, port, datasetDir],
  );

  const retry = () => {
    setConfig(null);
    setLoadError(null);
    setAttempt((value) => value + 1);
  };

  if (loadError) {
    return (
      <div className="grid gap-3">
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
        <p className="text-xs text-muted-foreground">
          Make sure you have linked a wallet to your account and that the job
          has not finished yet.
        </p>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!config || !result) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Preparing your credentials…
      </div>
    );
  }

  const errors = result.ok ? {} : result.errors;
  const portError = validatePort(port);
  const datasetError = datasetDir.trim()
    ? validateDatasetDir(datasetDir)
    : undefined;
  const expiresAt = new Date(config.expiresAt);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="supernode-port">SuperNode port</Label>
          <Input
            id="supernode-port"
            inputMode="numeric"
            value={port}
            aria-invalid={Boolean(portError)}
            onChange={(event) => setPort(event.target.value)}
          />
          {portError ? (
            <p role="alert" className="text-xs text-destructive">
              {portError}
            </p>
          ) : (
            <br />
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dataset-dir">Dataset directory on this machine</Label>
          <Input
            id="dataset-dir"
            placeholder="/path/to/your/dataset"
            autoComplete="off"
            spellCheck={false}
            value={datasetDir}
            aria-invalid={Boolean(datasetError)}
            onChange={(event) => setDatasetDir(event.target.value)}
          />
          {datasetError ? (
            <p role="alert" className="text-xs text-destructive">
              {datasetError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Mounted read-only at {config.datasetContainerPath}. The path stays
              in your browser and is never sent to the server.
            </p>
          )}
        </div>
      </div>

      {errors.config && (
        <p role="alert" className="text-sm text-destructive">
          {errors.config}
        </p>
      )}

      {result.ok ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Your token is valid until{" "}
              {format(expiresAt, "MMM d, yyyy 'at' h:mm a")}. Treat it like a
              password and do not share it.
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setRevealToken((value) => !value)}
            >
              {revealToken ? <EyeOff /> : <Eye />}
              {revealToken ? "Hide token" : "Show token"}
            </Button>
          </div>
          <CommandBlock
            step="1. Create a Docker network (if not exists)"
            label="SuperNode"
            display={result.commands.network}
            copyValue={result.commands.network}
          />
          <CommandBlock
            step="2. Start the SuperNode"
            label="SuperNode"
            display={
              revealToken ? result.commands.supernode : result.masked.supernode
            }
            copyValue={result.commands.supernode}
          />
          <CommandBlock
            step="3. Start the SuperExec (after the SuperNode is running)"
            label="SuperExec"
            display={result.commands.superexec}
            copyValue={result.commands.superexec}
          />
          <p className="text-xs text-muted-foreground">
            Keep both containers running until the job completes. Copying always
            includes the real token. To stop them later, run{" "}
            <code className="break-all">{result.commands.cleanup}</code>. The
            commands are for Linux, macOS, WSL, or Git Bash.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {datasetDir.trim()
            ? "Fix the highlighted field to generate your commands."
            : "Enter your dataset directory to generate your commands."}
        </p>
      )}
    </div>
  );
}

function CommandBlock({
  step,
  label,
  display,
  copyValue,
}: {
  step: string;
  label: string;
  display: string;
  copyValue: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue);
      toast.success(`${label} command copied`);
    } catch {
      toast.error("Unable to copy. Select the command and copy it manually.");
    }
  };

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{step}</span>
        <Button type="button" variant="outline" size="xs" onClick={copy}>
          <Copy />
          Copy
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs leading-relaxed">
        <code>{display}</code>
      </pre>
    </div>
  );
}
