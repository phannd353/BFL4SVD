import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements,
  adminAc,
  userAc,
} from 'better-auth/plugins/admin/access';

const actions = <T extends string>(...values: T[]) => values;

const entityStatements = {
  client: actions('create', 'read'),
  model: actions('read'),
  modelUpdate: actions('create', 'read', 'update', 'delete'),
  blockchainEvent: actions('read'),
  trainingJob: actions(
    'create',
    'read',
    'update',
    'delete',
    'start',
    'stop',
    'cancel',
    'finalize',
  ),
  trainingJobParticipant: actions('read', 'join', 'leave'),
  trainingJobRound: actions('create', 'read'),
  trainingJobLog: actions('read'),
};

const statements = {
  user: [...defaultStatements.user],
  session: [...defaultStatements.session],
  ...entityStatements,
};

/**
 * @default
 * user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"]
 * session: ["list", "revoke", "delete"]
 */
const ac = createAccessControl(statements);

const admin = ac.newRole({
  ...entityStatements,
  ...(adminAc.statements as any),
});

const client = ac.newRole({
  client: ['create', 'read'],
  model: ['read'],
  modelUpdate: ['create', 'read'],
  blockchainEvent: ['read'],
  trainingJob: ['read'],
  trainingJobParticipant: ['read', 'join', 'leave'],
  trainingJobRound: ['read'],
  trainingJobLog: ['read'],
  ...(userAc.statements as any),
});

const user = ac.newRole({
  model: ['read'],
  modelUpdate: ['read'],
  ...(userAc.statements as any),
});

const resources = Object.keys(statements) as (keyof typeof statements)[];
const roles = { admin, user, client } as const;
export type Role = keyof typeof roles;
const ROLES = (Object.keys(roles) as Role[]).reduce(
  (acc, role) => {
    acc[role.toUpperCase()] = role;
    return acc;
  },
  {} as Record<Uppercase<Role>, keyof typeof roles>,
);

export type Resource = keyof typeof statements;
export type Action = (typeof statements)[keyof typeof statements][number];

export { admin, client, user, ac, roles, resources, statements, ROLES };
