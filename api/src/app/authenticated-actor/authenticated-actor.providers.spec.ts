import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Test } from '@nestjs/testing';
import { getAppConfig } from '@nexus/config';
import {
  FetchDataverseClient,
  type DataverseClient,
} from '@nexus/modules/payment-notifications/infrastructure';
import {
  DataverseAuthenticatedActorGateway,
  DataverseAuthenticatedActorResolver,
  type AuthenticatedActorGateway,
  type AuthenticatedActorResolver,
  type DataverseAccessTokenProvider,
} from '@nexus/platform';

import { AppModule } from '../app.module';
import { DATAVERSE_ACCESS_TOKEN_PROVIDER, DataverseModule } from '../dataverse';
import { AuthenticatedActorModule } from './authenticated-actor.module';
import {
  AUTHENTICATED_ACTOR_PROVIDERS,
  authenticatedActorDataverseClientProviderDefinition,
  authenticatedActorGatewayProviderDefinition,
  authenticatedActorResolverProviderDefinition,
} from './authenticated-actor.providers';
import {
  AUTHENTICATED_ACTOR_DATAVERSE_CLIENT,
  AUTHENTICATED_ACTOR_GATEWAY,
  AUTHENTICATED_ACTOR_RESOLVER,
} from './authenticated-actor.tokens';

jest.mock('@nexus/config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('@nexus/modules/payment-notifications/infrastructure', () => ({
  FetchDataverseClient: jest.fn(),
}));

jest.mock('@nexus/platform', () => ({
  DataverseAuthenticatedActorGateway: jest.fn(),
  DataverseAuthenticatedActorResolver: jest.fn(),
}));

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => jest.fn()),
}));

const schema = Object.freeze({
  user: Object.freeze({
    entitySet: 'test_users',
    fields: Object.freeze({
      oid: 'test_user_oid',
      active: 'test_user_active',
      customerId: 'test_customer_id',
    }),
  }),
  role: Object.freeze({
    entitySet: 'test_roles',
    fields: Object.freeze({
      oid: 'test_role_oid',
      role: 'test_role',
    }),
  }),
  permission: Object.freeze({
    entitySet: 'test_permissions',
    fields: Object.freeze({
      oid: 'test_permission_oid',
      module: 'test_module',
      action: 'test_action',
      effect: 'test_effect',
    }),
  }),
  approvalGroupMember: Object.freeze({
    entitySet: 'test_group_members',
    fields: Object.freeze({
      oid: 'test_group_oid',
      approvalGroupId: 'test_group_id',
    }),
  }),
});

const config = {
  dataverse: Object.freeze({
    environmentUrl: ' https://example.crm.dynamics.com/// ',
    apiVersion: ' /v9.2/ ',
    authenticatedActor: Object.freeze({ schema }),
  }),
} as unknown as ReturnType<typeof getAppConfig>;

const dataverseAccessTokenProvider: DataverseAccessTokenProvider =
  Object.freeze({
    getAccessToken: jest.fn().mockResolvedValue('dataverse-access-token'),
  });

const client: DataverseClient = {
  create: jest.fn(),
  update: jest.fn(),
  deleteWhere: jest.fn(),
  findOne: jest.fn(),
  query: jest.fn(),
  executeAtomic: jest.fn(),
};

const gateway: AuthenticatedActorGateway = {
  findByOid: jest.fn(),
};

const resolver: AuthenticatedActorResolver = {
  resolveByOid: jest.fn(),
};

const productionSource = [
  'authenticated-actor.tokens.ts',
  'authenticated-actor.providers.ts',
  'authenticated-actor.module.ts',
]
  .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
  .join('\n');

async function createTestingModule() {
  return Test.createTestingModule({
    providers: [
      {
        provide: DATAVERSE_ACCESS_TOKEN_PROVIDER,
        useValue: dataverseAccessTokenProvider,
      },
      ...AUTHENTICATED_ACTOR_PROVIDERS,
    ],
  }).compile();
}

describe('Authenticated Actor providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAppConfig).mockReturnValue(config);
    jest
      .mocked(FetchDataverseClient)
      .mockImplementation(() => client as FetchDataverseClient);
    jest
      .mocked(DataverseAuthenticatedActorGateway)
      .mockImplementation(() => gateway as DataverseAuthenticatedActorGateway);
    jest
      .mocked(DataverseAuthenticatedActorResolver)
      .mockImplementation(
        () => resolver as DataverseAuthenticatedActorResolver,
      );
  });

  it('registers all three provider tokens', () => {
    expect(AUTHENTICATED_ACTOR_PROVIDERS).toHaveLength(3);
    expect([
      authenticatedActorDataverseClientProviderDefinition.provide,
      authenticatedActorGatewayProviderDefinition.provide,
      authenticatedActorResolverProviderDefinition.provide,
    ]).toEqual([
      AUTHENTICATED_ACTOR_DATAVERSE_CLIENT,
      AUTHENTICATED_ACTOR_GATEWAY,
      AUTHENTICATED_ACTOR_RESOLVER,
    ]);
  });

  it('exports only AUTHENTICATED_ACTOR_RESOLVER', () => {
    const exports = Reflect.getMetadata(
      'exports',
      AuthenticatedActorModule,
    ) as unknown[];

    expect(exports).toEqual([AUTHENTICATED_ACTOR_RESOLVER]);
  });

  it('imports DataverseModule to reuse outbound authentication', () => {
    const imports = Reflect.getMetadata(
      'imports',
      AuthenticatedActorModule,
    ) as unknown[];

    expect(imports).toEqual([DataverseModule]);
    expect(productionSource).not.toMatch(
      /from ['"]\.\.\/payment-notifications/i,
    );
  });

  it('composes the normalized Dataverse baseUrl', async () => {
    await createTestingModule();

    expect(FetchDataverseClient).toHaveBeenCalledWith({
      baseUrl: 'https://example.crm.dynamics.com/api/data/v9.2',
      getAccessToken: expect.any(Function),
    });
  });

  it('delegates token acquisition to the existing provider', async () => {
    await createTestingModule();
    const dependencies = jest.mocked(FetchDataverseClient).mock.calls[0]?.[0];

    await expect(dependencies?.getAccessToken()).resolves.toBe(
      'dataverse-access-token',
    );
    expect(dataverseAccessTokenProvider.getAccessToken).toHaveBeenCalledTimes(
      1,
    );
  });

  it('passes the configured schema to the gateway without mapping', async () => {
    await createTestingModule();

    expect(DataverseAuthenticatedActorGateway).toHaveBeenCalledWith({
      client,
      schema,
    });
  });

  it('passes the singleton gateway to the resolver', async () => {
    await createTestingModule();

    expect(DataverseAuthenticatedActorResolver).toHaveBeenCalledWith(gateway);
  });

  it('returns the same singleton for every token resolution', async () => {
    const module = await createTestingModule();

    expect(module.get(AUTHENTICATED_ACTOR_DATAVERSE_CLIENT)).toBe(
      module.get(AUTHENTICATED_ACTOR_DATAVERSE_CLIENT),
    );
    expect(module.get(AUTHENTICATED_ACTOR_GATEWAY)).toBe(
      module.get(AUTHENTICATED_ACTOR_GATEWAY),
    );
    expect(module.get(AUTHENTICATED_ACTOR_RESOLVER)).toBe(
      module.get(AUTHENTICATED_ACTOR_RESOLVER),
    );
  });

  it('executes each singleton factory exactly once', async () => {
    const module = await createTestingModule();

    module.get(AUTHENTICATED_ACTOR_DATAVERSE_CLIENT);
    module.get(AUTHENTICATED_ACTOR_DATAVERSE_CLIENT);
    module.get(AUTHENTICATED_ACTOR_GATEWAY);
    module.get(AUTHENTICATED_ACTOR_GATEWAY);
    module.get(AUTHENTICATED_ACTOR_RESOLVER);
    module.get(AUTHENTICATED_ACTOR_RESOLVER);

    expect(FetchDataverseClient).toHaveBeenCalledTimes(1);
    expect(DataverseAuthenticatedActorGateway).toHaveBeenCalledTimes(1);
    expect(DataverseAuthenticatedActorResolver).toHaveBeenCalledTimes(1);
  });

  it('does not acquire tokens, fetch, or query Dataverse during composition', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await createTestingModule();

    expect(dataverseAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
    expect(gateway.findByOid).not.toHaveBeenCalled();
    expect(resolver.resolveByOid).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('uses the expected injection chain', () => {
    expect(authenticatedActorDataverseClientProviderDefinition.inject).toEqual([
      DATAVERSE_ACCESS_TOKEN_PROVIDER,
    ]);
    expect(authenticatedActorGatewayProviderDefinition.inject).toEqual([
      AUTHENTICATED_ACTOR_DATAVERSE_CLIENT,
    ]);
    expect(authenticatedActorResolverProviderDefinition.inject).toEqual([
      AUTHENTICATED_ACTOR_GATEWAY,
    ]);
  });

  it('reports incomplete configuration without exposing secrets', () => {
    const secret = 'secret-that-must-not-appear';
    jest.mocked(getAppConfig).mockReturnValue({
      dataverse: {
        environmentUrl: 'https://example.crm.dynamics.com',
        apiVersion: 'v9.2',
      },
      azure: { clientSecret: secret },
    } as unknown as ReturnType<typeof getAppConfig>);

    expect(() =>
      authenticatedActorGatewayProviderDefinition.useFactory(client),
    ).toThrow('Dataverse authenticatedActor configuration is required');

    try {
      authenticatedActorGatewayProviderDefinition.useFactory(client);
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it('does not use incoming JWT, process.env, or physical schema names', () => {
    expect(productionSource).not.toMatch(
      /JwtStrategy|passport|authorization header|process\.env|test_users|test_user_oid/i,
    );
  });

  it('is imported exactly once from AppModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

    expect(
      imports.filter((module) => module === AuthenticatedActorModule),
    ).toHaveLength(1);
  });
});
