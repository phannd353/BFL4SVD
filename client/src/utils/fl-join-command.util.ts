import type { TrainingJobJoinConfigResponseDto } from "@/types";

/**
 * Builds the two `docker run` commands a participant uses to connect to a
 * training job: a Flower SuperNode, then a SuperExec that shares its network
 * namespace and runs the ClientApp against the participant's local dataset.
 *
 * Pure and dependency-free so it can be reasoned about (and tested) in
 * isolation. The output targets POSIX shells (Linux, macOS, WSL, Git Bash).
 * The dataset path is typed in the browser and never sent to the API.
 */

export const MIN_SUPERNODE_PORT = 1024;
export const MAX_SUPERNODE_PORT = 65535;
export const TOKEN_MASK = "••••••••••••";

export interface JoinCommandInput {
  port: string;
  datasetDir: string;
}

export interface JoinCommandErrors {
  config?: string;
  port?: string;
  datasetDir?: string;
}

export interface JoinCommandSet {
  network: string;
  supernode: string;
  superexec: string;
  cleanup: string;
}

export type JoinCommandResult =
  | { ok: true; commands: JoinCommandSet; masked: JoinCommandSet }
  | { ok: false; errors: JoinCommandErrors };

const SAFE_SHELL_WORD = /^[A-Za-z0-9_@%+=:,./-]+$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const POSIX_ABSOLUTE = /^\//;
const WINDOWS_ABSOLUTE = /^[A-Za-z]:[\\/]/;
const CONTAINER_NAME_PART = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const CONTAINER_PATH = /^\/[A-Za-z0-9_./-]*$/;
const TOKEN_CHARACTERS = /^[A-Za-z0-9_.-]+$/;

/** Quotes one argument for a POSIX shell using single quotes. */
export function shellQuote(value: string): string {
  if (value === "") return "''";
  if (SAFE_SHELL_WORD.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function validatePort(port: string): string | undefined {
  const value = port.trim();
  if (!/^\d+$/.test(value)) return "Enter a port number.";
  const number = Number(value);
  if (number < MIN_SUPERNODE_PORT || number > MAX_SUPERNODE_PORT) {
    return `Use a port between ${MIN_SUPERNODE_PORT} and ${MAX_SUPERNODE_PORT}.`;
  }
  return undefined;
}

export function validateDatasetDir(datasetDir: string): string | undefined {
  const value = datasetDir.trim();
  if (!value) return "Enter the absolute path to your dataset directory.";
  if (CONTROL_CHARACTERS.test(value)) {
    return "The path cannot contain control characters or line breaks.";
  }
  if (!POSIX_ABSOLUTE.test(value) && !WINDOWS_ABSOLUTE.test(value)) {
    return "Use an absolute path (for example /home/me/dataset). “~” and relative paths are not expanded by Docker.";
  }
  if (value.includes(",") || value.includes('"')) {
    return "Docker's --mount option cannot take paths containing commas or double quotes. Use a path without them or a symlink.";
  }
  return undefined;
}

function validateConfig(
  config: TrainingJobJoinConfigResponseDto,
): string | undefined {
  if (!CONTAINER_NAME_PART.test(config.jobId)) {
    return "The job identifier cannot be used in a container name.";
  }
  if (!TOKEN_CHARACTERS.test(config.authToken)) {
    return "The issued token has an unexpected format.";
  }
  if (!CONTAINER_PATH.test(config.datasetContainerPath)) {
    return "The dataset mount path provided by the server is invalid.";
  }
  if (
    !config.superlinkAddress ||
    CONTROL_CHARACTERS.test(config.superlinkAddress)
  ) {
    return "The SuperLink address provided by the server is invalid.";
  }
  if (!config.supernodeImage || !config.superexecImage) {
    return "The Docker images provided by the server are invalid.";
  }
  return undefined;
}

function render(
  config: TrainingJobJoinConfigResponseDto,
  port: string,
  datasetDir: string,
  token: string,
): JoinCommandSet {
  const networkName = "bfl4svd-network";
  const supernodeName = `bfl4svd-supernode-${config.jobId}`;
  const superexecName = `bfl4svd-superexec-${config.jobId}`;
  const nodeConfig = `data-dir="${config.datasetContainerPath}" auth-token="${token}"`;
  const mount = `type=bind,source=${datasetDir},target=${config.datasetContainerPath},readonly`;

  const network = `docker network inspect ${shellQuote(networkName)} >/dev/null 2>&1 || docker network create ${shellQuote(networkName)}`;
  const supernode = [
    "docker run -d",
    "--rm",
    `--name ${shellQuote(supernodeName)}`,
    `--network ${shellQuote(networkName)}`,
    shellQuote(config.supernodeImage),
    "--insecure",
    `--superlink ${shellQuote(config.superlinkAddress)}`,
    "--host 0.0.0.0",
    `--port ${port}`,
    "--isolation process",
    `--node-config ${shellQuote(nodeConfig)}`,
  ];
  const superexec = [
    "docker run -d",
    "--rm",
    `--name ${shellQuote(superexecName)}`,
    `--network ${shellQuote(networkName)}`,
    `--mount ${shellQuote(mount)}`,
    shellQuote(config.superexecImage),
    "--insecure",
    `--runtime-api-address ${shellQuote(supernodeName)}:${port}`,
  ];

  const multiline = (parts: string[]) => parts.join(" \\\n  ");
  return {
    network,
    supernode: multiline(supernode),
    superexec: multiline(superexec),
    cleanup: `docker rm -f ${shellQuote(superexecName)} ${shellQuote(supernodeName)}`,
  };
}

export function buildJoinCommands(
  config: TrainingJobJoinConfigResponseDto,
  input: JoinCommandInput,
): JoinCommandResult {
  const errors: JoinCommandErrors = {
    config: validateConfig(config),
    port: validatePort(input.port),
    datasetDir: validateDatasetDir(input.datasetDir),
  };
  if (errors.config || errors.port || errors.datasetDir) {
    return { ok: false, errors };
  }

  const port = String(Number(input.port.trim()));
  const datasetDir = input.datasetDir.trim();
  return {
    ok: true,
    commands: render(config, port, datasetDir, config.authToken),
    masked: render(config, port, datasetDir, TOKEN_MASK),
  };
}
