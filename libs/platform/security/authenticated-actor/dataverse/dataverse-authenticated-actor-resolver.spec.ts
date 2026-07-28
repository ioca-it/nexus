import type { AuthenticatedActorPersistence } from './authenticated-actor.persistence.types';
import {
  toAuthenticatedActor,
  type AuthenticatedActorMapper,
} from './authenticated-actor.mapper';
import type { AuthenticatedActorGateway } from './authenticated-actor.gateway';
import {
  DataverseAuthenticatedActorGateway,
  type DataverseAuthenticatedActorSchema,
  type DataverseQueryClient,
} from './dataverse-authenticated-actor.gateway';
import { DataverseAuthenticatedActorResolver } from './dataverse-authenticated-actor-resolver';

const persistence: AuthenticatedActorPersistence = Object.freeze({
  user: Object.freeze({
    oid: 'oid-client-1',
    active: true,
    customerId: 'customer-1',
  }),
  roles: Object.freeze([
    Object.freeze({ oid: 'oid-client-1', role: 'Nexus.Customer' }),
    Object.freeze({ oid: 'oid-client-1', role: 'Payments.Approver' }),
  ]),
  permissions: Object.freeze([
    Object.freeze({
      oid: 'oid-client-1',
      module: 'payments',
      action: 'read',
      effect: 'allow',
    }),
    Object.freeze({
      oid: 'oid-client-1',
      module: 'payments',
      action: 'delete',
      effect: 'deny',
    }),
  ]),
  approvalGroupMembers: Object.freeze([
    Object.freeze({
      oid: 'oid-client-1',
      approvalGroupId: 'approvers-1',
    }),
    Object.freeze({
      oid: 'oid-client-1',
      approvalGroupId: 'approvers-2',
    }),
  ]),
});

const schema: DataverseAuthenticatedActorSchema = Object.freeze({
  user: Object.freeze({
    entitySet: 'configured_users',
    fields: Object.freeze({
      oid: 'configured_user_oid',
      active: 'configured_user_active',
      customerId: 'configured_customer_id',
    }),
  }),
  role: Object.freeze({
    entitySet: 'configured_roles',
    fields: Object.freeze({
      oid: 'configured_role_oid',
      role: 'configured_role',
    }),
  }),
  permission: Object.freeze({
    entitySet: 'configured_permissions',
    fields: Object.freeze({
      oid: 'configured_permission_oid',
      module: 'configured_module',
      action: 'configured_action',
      effect: 'configured_effect',
    }),
  }),
  approvalGroupMember: Object.freeze({
    entitySet: 'configured_group_members',
    fields: Object.freeze({
      oid: 'configured_group_member_oid',
      approvalGroupId: 'configured_approval_group_id',
    }),
  }),
});

function createGateway(): jest.Mocked<AuthenticatedActorGateway> {
  return {
    findByOid: jest.fn().mockResolvedValue(null),
  };
}

function createMapper(): jest.Mocked<AuthenticatedActorMapper> {
  return {
    toAuthenticatedActor: jest.fn(),
  };
}

function createClient(): jest.Mocked<DataverseQueryClient> {
  return {
    query: jest.fn().mockResolvedValue([]),
  };
}

function createPhysicalUser(
  active: boolean,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.user.fields.oid]: 'oid-client-1',
    [schema.user.fields.active]: active,
    [schema.user.fields.customerId]: 'customer-1',
  });
}

function createPhysicalRole(role: string): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.role.fields.oid]: 'oid-client-1',
    [schema.role.fields.role]: role,
  });
}

function createPhysicalPermission(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.permission.fields.oid]: 'oid-client-1',
    [schema.permission.fields.module]: 'payments',
    [schema.permission.fields.action]: 'read',
    [schema.permission.fields.effect]: 'allow',
  });
}

function createPhysicalGroupMember(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.approvalGroupMember.fields.oid]: 'oid-client-1',
    [schema.approvalGroupMember.fields.approvalGroupId]: 'approvers-1',
  });
}

describe('DataverseAuthenticatedActorResolver', () => {
  it('returns the mapped actor for a found user', async () => {
    const gateway = createGateway();
    const mapper = createMapper();
    const actor = toAuthenticatedActor(persistence);
    gateway.findByOid.mockResolvedValue(persistence);
    mapper.toAuthenticatedActor.mockReturnValue(actor);
    const resolver = new DataverseAuthenticatedActorResolver(gateway, mapper);

    await expect(resolver.resolveByOid('oid-client-1')).resolves.toBe(actor);
    expect(gateway.findByOid).toHaveBeenCalledWith('oid-client-1');
    expect(mapper.toAuthenticatedActor).toHaveBeenCalledWith(persistence);
  });

  it.each(['usuario inexistente', 'usuario inactivo'])(
    'returns null for %s',
    async () => {
      const gateway = createGateway();
      const mapper = createMapper();
      const resolver = new DataverseAuthenticatedActorResolver(gateway, mapper);

      await expect(resolver.resolveByOid('oid-client-1')).resolves.toBeNull();
      expect(mapper.toAuthenticatedActor).not.toHaveBeenCalled();
    },
  );

  it('propagates gateway exceptions', async () => {
    const technicalError = new Error('Dataverse unavailable');
    const gateway = createGateway();
    gateway.findByOid.mockRejectedValue(technicalError);
    const resolver = new DataverseAuthenticatedActorResolver(
      gateway,
      createMapper(),
    );

    await expect(resolver.resolveByOid('oid-client-1')).rejects.toBe(
      technicalError,
    );
  });

  it.each(['', '   '])(
    'rejects an empty oid represented by %p',
    async (oid) => {
      const gateway = createGateway();
      const resolver = new DataverseAuthenticatedActorResolver(
        gateway,
        createMapper(),
      );

      await expect(resolver.resolveByOid(oid)).rejects.toThrow(
        'oid is required',
      );
      expect(gateway.findByOid).not.toHaveBeenCalled();
    },
  );
});

describe('AuthenticatedActorMapper', () => {
  it('maps a client', () => {
    const actor = toAuthenticatedActor(persistence);

    expect(actor.userId).toBe('oid-client-1');
    expect(actor.customerId).toBe('customer-1');
  });

  it('maps an administrator without inferring a customer', () => {
    const actor = toAuthenticatedActor({
      ...persistence,
      user: {
        ...persistence.user,
        customerId: null,
      },
      roles: [{ oid: 'oid-admin-1', role: 'Nexus.Admin' }],
    });

    expect(actor.customerId).toBeNull();
    expect(actor.roles).toEqual(['Nexus.Admin']);
  });

  it('maps every explicit role', () => {
    expect(toAuthenticatedActor(persistence).roles).toEqual([
      'Nexus.Customer',
      'Payments.Approver',
    ]);
  });

  it('maps every explicit permission', () => {
    expect(toAuthenticatedActor(persistence).permissions).toEqual([
      {
        module: 'payments',
        action: 'read',
        effect: 'allow',
      },
      {
        module: 'payments',
        action: 'delete',
        effect: 'deny',
      },
    ]);
  });

  it('maps every explicit approvalGroupId', () => {
    expect(toAuthenticatedActor(persistence).approvalGroupIds).toEqual([
      'approvers-1',
      'approvers-2',
    ]);
  });

  it('returns an immutable actor without modifying persistence', () => {
    const original = JSON.parse(JSON.stringify(persistence)) as unknown;
    const actor = toAuthenticatedActor(persistence);

    expect(persistence).toEqual(original);
    expect(Object.isFrozen(actor)).toBe(true);
    expect(Object.isFrozen(actor.roles)).toBe(true);
    expect(Object.isFrozen(actor.permissions)).toBe(true);
    expect(Object.isFrozen(actor.permissions[0])).toBe(true);
    expect(Object.isFrozen(actor.approvalGroupIds)).toBe(true);
  });
});

describe('DataverseAuthenticatedActorGateway', () => {
  it('returns null for a missing user', async () => {
    const client = createClient();
    const gateway = new DataverseAuthenticatedActorGateway({ client, schema });

    await expect(gateway.findByOid('missing-oid')).resolves.toBeNull();
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(schema.user.entitySet, {
      [schema.user.fields.oid]: 'missing-oid',
    });
  });

  it('returns null for an inactive user without loading relations', async () => {
    const client = createClient();
    client.query.mockResolvedValueOnce([createPhysicalUser(false)]);
    const gateway = new DataverseAuthenticatedActorGateway({ client, schema });

    await expect(gateway.findByOid('oid-client-1')).resolves.toBeNull();
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('loads roles, permissions, and groups in grouped queries', async () => {
    const client = createClient();
    client.query
      .mockResolvedValueOnce([createPhysicalUser(true)])
      .mockResolvedValueOnce([
        createPhysicalRole('Nexus.Customer'),
        createPhysicalRole('Payments.Approver'),
      ])
      .mockResolvedValueOnce([createPhysicalPermission()])
      .mockResolvedValueOnce([createPhysicalGroupMember()]);
    const gateway = new DataverseAuthenticatedActorGateway({ client, schema });

    const result = await gateway.findByOid('oid-client-1');

    expect(client.query).toHaveBeenCalledTimes(4);
    expect(client.query.mock.calls).toEqual([
      [schema.user.entitySet, { [schema.user.fields.oid]: 'oid-client-1' }],
      [schema.role.entitySet, { [schema.role.fields.oid]: 'oid-client-1' }],
      [
        schema.permission.entitySet,
        { [schema.permission.fields.oid]: 'oid-client-1' },
      ],
      [
        schema.approvalGroupMember.entitySet,
        { [schema.approvalGroupMember.fields.oid]: 'oid-client-1' },
      ],
    ]);
    expect(result).toEqual({
      user: persistence.user,
      roles: persistence.roles,
      permissions: [persistence.permissions[0]],
      approvalGroupMembers: [persistence.approvalGroupMembers[0]],
    });
  });

  it('does not perform one query per role, permission, or group', async () => {
    const client = createClient();
    client.query
      .mockResolvedValueOnce([createPhysicalUser(true)])
      .mockResolvedValueOnce([
        createPhysicalRole('role-1'),
        createPhysicalRole('role-2'),
        createPhysicalRole('role-3'),
      ])
      .mockResolvedValueOnce([
        createPhysicalPermission(),
        createPhysicalPermission(),
      ])
      .mockResolvedValueOnce([
        createPhysicalGroupMember(),
        createPhysicalGroupMember(),
      ]);
    const gateway = new DataverseAuthenticatedActorGateway({ client, schema });

    await gateway.findByOid('oid-client-1');

    expect(client.query).toHaveBeenCalledTimes(4);
  });
});
