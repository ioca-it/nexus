import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  AuthenticatedActor,
  AuthenticatedActorResolver,
} from '@nexus/platform';

import type { AuthenticatedRequestUser } from './authenticated-request-user.types';
import type { EntraJwtPayload } from './jwt.strategy';

const AUTH_VARIABLES = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID'] as const;

const UNUSED_INTEGRATION_VARIABLES = [
  ['Dataverse', ['DATAVERSE_ENVIRONMENT_URL', 'DATAVERSE_API_VERSION']],
  ['Business Central', ['BC_TENANT_ID', 'BC_ENVIRONMENT', 'BC_COMPANY_ID']],
  ['Azure Storage', ['AZURE_STORAGE_ACCOUNT_NAME']],
  ['Azure Key Vault', ['AZURE_KEY_VAULT_URL']],
] as const;

const MANAGED_VARIABLES = [
  ...AUTH_VARIABLES,
  'API_URL',
  'FRONTEND_URL',
  'AZURE_CLIENT_SECRET',
  'APPLICATIONINSIGHTS_CONNECTION_STRING',
  ...UNUSED_INTEGRATION_VARIABLES.flatMap(([, variables]) => variables),
] as const;

const originalEnvironment = new Map(
  MANAGED_VARIABLES.map((name) => [name, process.env[name]]),
);

interface JwtStrategyInstance {
  validate(payload: EntraJwtPayload): Promise<AuthenticatedRequestUser>;
}

function setAuthEnvironment(): void {
  for (const name of MANAGED_VARIABLES) {
    delete process.env[name];
  }

  process.env['AZURE_TENANT_ID'] = 'tenant-id';
  process.env['AZURE_CLIENT_ID'] = 'client-id';
}

function createResolver(
  result: AuthenticatedActor | null = null,
): jest.Mocked<AuthenticatedActorResolver> {
  return {
    resolveByOid: jest.fn().mockResolvedValue(result),
  };
}

const createJwtStrategy = async (
  resolver: AuthenticatedActorResolver = createResolver(),
): Promise<JwtStrategyInstance> => {
  const { JwtStrategy } = await import('./jwt.strategy');

  return new JwtStrategy(resolver);
};

function createActor(
  overrides: Partial<AuthenticatedActor> = {},
): AuthenticatedActor {
  return Object.freeze({
    userId: 'oid-user-1',
    customerId: 'customer-1',
    roles: Object.freeze(['Nexus.Customer']),
    permissions: Object.freeze([
      Object.freeze({
        module: 'payments',
        action: 'read',
        effect: 'allow' as const,
      }),
    ]),
    approvalGroupIds: Object.freeze(['approvers-1']),
    ...overrides,
  });
}

function createPayload(
  overrides: Partial<EntraJwtPayload> = {},
): EntraJwtPayload {
  return Object.freeze({
    aud: 'client-id',
    iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
    oid: 'oid-user-1',
    sub: 'subject-1',
    tid: 'tenant-id',
    ...overrides,
  });
}

function prepareJwtStrategyModule(): void {
  jest.resetModules();
  jest.doMock('jwks-rsa', () => ({
    passportJwtSecret: jest.fn(() => jest.fn()),
  }));
  setAuthEnvironment();
}

afterAll(() => {
  for (const [name, value] of originalEnvironment) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe('JwtStrategy Auth configuration', () => {
  beforeEach(prepareJwtStrategyModule);

  it('initializes with only the required Auth variables', async () => {
    await expect(createJwtStrategy()).resolves.toBeDefined();
  });

  it.each(UNUSED_INTEGRATION_VARIABLES)(
    'does not require %s configuration',
    async (_integration, variables) => {
      for (const name of variables) {
        expect(process.env[name]).toBeUndefined();
      }

      await expect(createJwtStrategy()).resolves.toBeDefined();
    },
  );

  it('reports a missing AZURE_TENANT_ID', async () => {
    delete process.env['AZURE_TENANT_ID'];

    await expect(createJwtStrategy()).rejects.toThrow(
      'Missing required environment variables: AZURE_TENANT_ID',
    );
  });

  it('reports a missing AZURE_CLIENT_ID', async () => {
    delete process.env['AZURE_CLIENT_ID'];

    await expect(createJwtStrategy()).rejects.toThrow(
      'Missing required environment variables: AZURE_CLIENT_ID',
    );
  });
});

describe('JwtStrategy authenticated actor resolution', () => {
  beforeEach(prepareJwtStrategyModule);

  it('returns a frozen request user for a valid oid and active actor', async () => {
    const actor = createActor();
    const resolver = createResolver(actor);
    const strategy = await createJwtStrategy(resolver);

    const user = await strategy.validate(
      createPayload({ oid: '  oid-user-1  ' }),
    );

    expect(user).toEqual({
      oid: 'oid-user-1',
      sub: 'subject-1',
      tid: 'tenant-id',
      actor,
    });
    expect(user.actor).toBe(actor);
    expect(Object.isFrozen(user)).toBe(true);
    expect(Object.keys(user)).toEqual(['oid', 'sub', 'tid', 'actor']);
    expect(resolver.resolveByOid).toHaveBeenCalledTimes(1);
    expect(resolver.resolveByOid).toHaveBeenCalledWith('oid-user-1');
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
    ['spaces', '   '],
  ] as const)(
    'rejects an %s oid without resolving an actor',
    async (_case, oid) => {
      const resolver = createResolver(createActor());
      const strategy = await createJwtStrategy(resolver);

      await expect(
        strategy.validate(createPayload({ oid })),
      ).rejects.toMatchObject({
        status: 401,
        message: 'Invalid Microsoft Entra ID token.',
      });
      expect(resolver.resolveByOid).not.toHaveBeenCalled();
    },
  );

  it('does not fall back from oid to sub', async () => {
    const resolver = createResolver(createActor());
    const strategy = await createJwtStrategy(resolver);

    await expect(
      strategy.validate(
        createPayload({
          oid: undefined,
          sub: 'oid-user-1',
        }),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(resolver.resolveByOid).not.toHaveBeenCalled();
  });

  it.each(['missing user', 'inactive user'])(
    'returns the same unauthorized response for a %s',
    async () => {
      const strategy = await createJwtStrategy(createResolver(null));

      await expect(strategy.validate(createPayload())).rejects.toMatchObject({
        status: 401,
        message: 'Authenticated NEXUS user is not authorized.',
      });
    },
  );

  it('rejects an actor whose userId does not match oid', async () => {
    const strategy = await createJwtStrategy(
      createResolver(createActor({ userId: 'different-oid' })),
    );

    await expect(strategy.validate(createPayload())).rejects.toMatchObject({
      status: 401,
      message: 'Authenticated NEXUS user is not authorized.',
    });
  });

  it('reports resolver failures as safe internal errors', async () => {
    const resolver = createResolver();
    resolver.resolveByOid.mockRejectedValue(
      new Error('sensitive Dataverse failure'),
    );
    const strategy = await createJwtStrategy(resolver);

    await expect(strategy.validate(createPayload())).rejects.toMatchObject({
      status: 500,
      message: 'Unable to resolve authenticated NEXUS user.',
    });

    try {
      await strategy.validate(createPayload());
    } catch (error) {
      expect(String(error)).not.toContain('sensitive Dataverse failure');
    }
  });

  it.each([
    ['sub', { sub: '' }],
    ['tid', { tid: '   ' }],
  ] as const)('continues rejecting a missing %s', async (_claim, overrides) => {
    const resolver = createResolver(createActor());
    const strategy = await createJwtStrategy(resolver);

    await expect(
      strategy.validate(createPayload(overrides)),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid Microsoft Entra ID token.',
    });
    expect(resolver.resolveByOid).not.toHaveBeenCalled();
  });

  it('does not infer permissions from Nexus.Admin', async () => {
    const actor = createActor({
      customerId: null,
      roles: Object.freeze(['Nexus.Admin']),
      permissions: Object.freeze([]),
    });
    const strategy = await createJwtStrategy(createResolver(actor));

    const user = await strategy.validate(createPayload());

    expect(user.actor).toBe(actor);
    expect(user.actor.roles).toEqual(['Nexus.Admin']);
    expect(user.actor.permissions).toEqual([]);
  });

  it('does not resolve an actor during strategy construction', async () => {
    const resolver = createResolver(createActor());

    await createJwtStrategy(resolver);

    expect(resolver.resolveByOid).not.toHaveBeenCalled();
  });

  it('imports AuthenticatedActorModule from AuthModule', async () => {
    const { AuthenticatedActorModule } = await import(
      '../app/authenticated-actor'
    );
    const { AuthModule } = await import('./auth.module');
    const imports = Reflect.getMetadata('imports', AuthModule) as unknown[];

    expect(
      imports.filter((module) => module === AuthenticatedActorModule),
    ).toHaveLength(1);
  });

  it('does not use outbound tokens or identity fallbacks', () => {
    const source = readFileSync(join(__dirname, 'jwt.strategy.ts'), 'utf8');

    expect(source).not.toMatch(
      /AccessTokenProvider|DATAVERSE_ACCESS_TOKEN_PROVIDER|AZURE_ACCESS_TOKEN_PROVIDER|preferred_username.*oid|sub.*userId/i,
    );
  });
});
