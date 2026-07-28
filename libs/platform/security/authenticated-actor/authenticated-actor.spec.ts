import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Permission } from '../../engines/permissions';
import type { AuthenticatedActorResolver } from './authenticated-actor-resolver';
import { createAuthenticatedActor } from './authenticated-actor';
import type {
  AuthenticatedActor,
  CreateAuthenticatedActorInput,
} from './authenticated-actor.types';

const ALLOW_CREATE: Permission = {
  module: 'payments',
  action: 'create',
  effect: 'allow',
};

const SOURCE_FILES = [
  'authenticated-actor.types.ts',
  'authenticated-actor.ts',
  'authenticated-actor-resolver.ts',
]
  .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
  .join('\n');

function createInput(
  overrides: Partial<CreateAuthenticatedActorInput> = {},
): CreateAuthenticatedActorInput {
  return {
    userId: 'oid-client-1',
    customerId: 'customer-1',
    roles: ['Nexus.Customer'],
    permissions: [ALLOW_CREATE],
    approvalGroupIds: ['approvers-1'],
    ...overrides,
  };
}

describe('createAuthenticatedActor', () => {
  it('creates a client actor', () => {
    const actor = createAuthenticatedActor(createInput());

    expect(actor).toEqual({
      userId: 'oid-client-1',
      customerId: 'customer-1',
      roles: ['Nexus.Customer'],
      permissions: [ALLOW_CREATE],
      approvalGroupIds: ['approvers-1'],
    });
  });

  it('creates an administrative actor with no customerId', () => {
    const actor = createAuthenticatedActor(
      createInput({
        customerId: null,
        roles: ['Nexus.Admin'],
      }),
    );

    expect(actor.customerId).toBeNull();
    expect(actor.roles).toEqual(['Nexus.Admin']);
  });

  it('preserves userId as the actor identifier', () => {
    const actor = createAuthenticatedActor(
      createInput({ userId: 'entra-oid-123' }),
    );

    expect(actor.userId).toBe('entra-oid-123');
  });

  it.each(['', '   '])('rejects an empty userId represented by %p', (userId) => {
    expect(() => createAuthenticatedActor(createInput({ userId }))).toThrow(
      'userId is required',
    );
  });

  it('trims external spaces from userId', () => {
    const actor = createAuthenticatedActor(
      createInput({ userId: '  entra-oid-123  ' }),
    );

    expect(actor.userId).toBe('entra-oid-123');
  });

  it('trims and preserves a valid customerId', () => {
    const actor = createAuthenticatedActor(
      createInput({ customerId: '  customer-123  ' }),
    );

    expect(actor.customerId).toBe('customer-123');
  });

  it.each(['', '   '])(
    'rejects an empty non-null customerId represented by %p',
    (customerId) => {
      expect(() =>
        createAuthenticatedActor(createInput({ customerId })),
      ).toThrow('customerId is required');
    },
  );

  it('allows roles to be empty', () => {
    const actor = createAuthenticatedActor(createInput({ roles: [] }));

    expect(actor.roles).toEqual([]);
  });

  it('allows permissions to be empty without granting defaults', () => {
    const actor = createAuthenticatedActor(createInput({ permissions: [] }));

    expect(actor.permissions).toEqual([]);
  });

  it('allows approvalGroupIds to be empty', () => {
    const actor = createAuthenticatedActor(
      createInput({ approvalGroupIds: [] }),
    );

    expect(actor.approvalGroupIds).toEqual([]);
  });

  it('does not infer permissions from Nexus.Admin', () => {
    const actor = createAuthenticatedActor(
      createInput({
        customerId: null,
        roles: ['Nexus.Admin'],
        permissions: [],
      }),
    );

    expect(actor.permissions).toEqual([]);
  });

  it('does not infer customerId', () => {
    const actor = createAuthenticatedActor(
      createInput({
        customerId: null,
        roles: ['Nexus.Customer'],
      }),
    );

    expect(actor.customerId).toBeNull();
  });

  it.each([
    ['roles', { roles: [''] }],
    ['roles', { roles: ['   '] }],
    ['approvalGroupIds', { approvalGroupIds: [''] }],
    ['approvalGroupIds', { approvalGroupIds: ['   '] }],
  ] as const)(
    'rejects empty strings in %s',
    (fieldName, overrides: Partial<CreateAuthenticatedActorInput>) => {
      expect(() =>
        createAuthenticatedActor(createInput(overrides)),
      ).toThrow(`${fieldName} must not contain empty values`);
    },
  );

  it('copies and freezes roles', () => {
    const roles = ['Nexus.Customer'];
    const actor = createAuthenticatedActor(createInput({ roles }));

    roles.push('Nexus.Admin');

    expect(actor.roles).toEqual(['Nexus.Customer']);
    expect(Object.isFrozen(actor.roles)).toBe(true);
  });

  it('copies and freezes permissions and every permission value', () => {
    const permission = {
      module: 'payments',
      action: 'read',
      effect: 'allow' as const,
    };
    const permissions: Permission[] = [permission];
    const actor = createAuthenticatedActor(createInput({ permissions }));

    permission.action = 'delete';
    permissions.push(ALLOW_CREATE);

    expect(actor.permissions).toEqual([
      {
        module: 'payments',
        action: 'read',
        effect: 'allow',
      },
    ]);
    expect(Object.isFrozen(actor.permissions)).toBe(true);
    expect(Object.isFrozen(actor.permissions[0])).toBe(true);
  });

  it('copies and freezes approvalGroupIds', () => {
    const approvalGroupIds = ['approvers-1'];
    const actor = createAuthenticatedActor(
      createInput({ approvalGroupIds }),
    );

    approvalGroupIds.push('approvers-2');

    expect(actor.approvalGroupIds).toEqual(['approvers-1']);
    expect(Object.isFrozen(actor.approvalGroupIds)).toBe(true);
  });

  it('freezes the resulting actor', () => {
    const actor = createAuthenticatedActor(createInput());

    expect(Object.isFrozen(actor)).toBe(true);
  });

  it('does not modify the input', () => {
    const input = createInput({
      userId: '  oid-client-1  ',
      customerId: '  customer-1  ',
    });
    const originalInput = {
      ...input,
      roles: [...input.roles],
      permissions: input.permissions.map((permission) => ({ ...permission })),
      approvalGroupIds: [...input.approvalGroupIds],
    };

    createAuthenticatedActor(input);

    expect(input).toEqual(originalInput);
  });
});

describe('AuthenticatedActorResolver', () => {
  it('defines resolveByOid as returning an actor or null', async () => {
    const actor: AuthenticatedActor = createAuthenticatedActor(createInput());
    const resolver: AuthenticatedActorResolver = {
      resolveByOid: jest
        .fn<Promise<AuthenticatedActor | null>, [string]>()
        .mockResolvedValueOnce(actor)
        .mockResolvedValueOnce(null),
    };

    await expect(resolver.resolveByOid('active-oid')).resolves.toBe(actor);
    await expect(resolver.resolveByOid('missing-or-inactive-oid')).resolves.toBe(
      null,
    );
  });

  it('does not depend on NestJS, Dataverse, JWT, or Payment Notifications', () => {
    expect(SOURCE_FILES).not.toMatch(
      /@nestjs|dataverse|jwt|payment-notifications/i,
    );
  });
});
