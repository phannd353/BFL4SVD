import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements,
  adminAc,
  userAc,
} from 'better-auth/plugins/admin/access';

const crudActions = ['create', 'read', 'update', 'delete'] as (
  'create' | 'read' | 'update' | 'delete'
)[];

const eventStatements = {
  historicalEvent: crudActions,
  eventCategory: crudActions,
  eventEdit: crudActions,
};

const cmsStatements = {
  app: crudActions,
  footerNavItem: crudActions,
  headerNavItem: crudActions,
  ping: crudActions,
  post: crudActions,
  comment: crudActions,
};

const statements = {
  // convert readonly arrays to mutable arrays
  user: [...defaultStatements.user],
  session: [...defaultStatements.session],
  ...eventStatements,
  ...cmsStatements,
};

/**
 * @default
 * user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"]
 * session: ["list", "revoke", "delete"]
 */
const ac = createAccessControl(statements);

const admin = ac.newRole({
  ...eventStatements,
  ...cmsStatements,
  ...(adminAc.statements as any),
});

const editor = ac.newRole({
  ...eventStatements,
  eventEdit: ['create', 'read', 'update'],
  ...cmsStatements,
  ping: [],
  ...(userAc.statements as any),
});

const user = ac.newRole({
  historicalEvent: ['read'],
  eventCategory: ['read'],
  eventEdit: ['read'],
  app: ['read'],
  footerNavItem: ['read'],
  headerNavItem: ['read'],
  blog: ['read'],
  ...userAc.statements,
} as unknown as any);

const resources = Object.keys(statements) as (keyof typeof statements)[];
const roles = { admin, user, editor } as const;
export type Role = keyof typeof roles;
const ROLES = (Object.keys(roles) as Role[]).reduce(
  (acc, role) => {
    acc[role.toUpperCase()] = role;
    return acc;
  },
  {} as Record<Uppercase<Role>, keyof typeof roles>,
);

export type Resource = keyof typeof statements;
export type Action = (typeof crudActions)[number];

export { admin, editor, user, ac, roles, resources, statements, ROLES };
