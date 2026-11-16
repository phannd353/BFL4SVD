/**
 * Defaults offered to participants when they assemble the Flower SuperNode /
 * SuperExec `docker run` commands in the web UI.
 *
 * `datasetContainerPath` is both the bind-mount target of the participant's
 * dataset directory and the `data-dir` node-config value read by the Flower
 * ClientApp, so the two must stay in sync.
 */
export const FL_JOIN_DEFAULTS = {
  supernodePort: 9005,
  datasetContainerPath: '/data',
} as const;

/** Job statuses in which a joined participant can connect a SuperNode. */
export const FL_JOINABLE_JOB_STATUSES = ['WAITING', 'RUNNING'] as const;
