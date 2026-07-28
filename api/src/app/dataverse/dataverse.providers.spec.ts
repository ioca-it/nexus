import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getAppConfig } from '@nexus/config';
import {
  createAzureAccessTokenProvider,
  createDataverseAccessTokenProvider,
  type AzureAccessTokenProvider,
  type DataverseAccessTokenProvider,
} from '@nexus/platform';

import { authenticatedActorDataverseClientProviderDefinition } from '../authenticated-actor/authenticated-actor.providers';
import { AuthenticatedActorModule } from '../authenticated-actor';
import { AppModule } from '../app.module';
import { PaymentNotificationsModule } from '../payment-notifications';
import { paymentNotificationRepositoryProviderDefinition } from '../payment-notifications/payment-notifications.providers';
import { DataverseModule } from './dataverse.module';
import {
  DATAVERSE_PROVIDERS,
  azureAccessTokenProviderDefinition,
  dataverseAccessTokenProviderDefinition,
} from './dataverse.providers';
import {
  AZURE_ACCESS_TOKEN_PROVIDER,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
} from './dataverse.tokens';

jest.mock('@nexus/config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('@nexus/platform', () => ({
  createAzureAccessTokenProvider: jest.fn(),
  createDataverseAccessTokenProvider: jest.fn(),
}));

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => jest.fn()),
}));

const config = {
  azure: Object.freeze({
    tenantId: 'test-tenant-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  }),
  dataverse: Object.freeze({
    environmentUrl: ' https://example.crm.dynamics.com/// ',
  }),
} as unknown as ReturnType<typeof getAppConfig>;

const azureAccessTokenProvider: AzureAccessTokenProvider = Object.freeze({
  getAccessToken: jest.fn(),
});

const dataverseAccessTokenProvider: DataverseAccessTokenProvider =
  Object.freeze({
    getAccessToken: jest.fn(),
  });

const productionSource = [
  'dataverse.tokens.ts',
  'dataverse.providers.ts',
  'dataverse.module.ts',
  'dataverse-url.ts',
]
  .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
  .join('\n');

async function createTestingModule() {
  return Test.createTestingModule({
    imports: [DataverseModule],
  }).compile();
}

describe('Dataverse providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAppConfig).mockReturnValue(config);
    jest
      .mocked(createAzureAccessTokenProvider)
      .mockReturnValue(azureAccessTokenProvider);
    jest
      .mocked(createDataverseAccessTokenProvider)
      .mockReturnValue(dataverseAccessTokenProvider);
  });

  it('registers both stable Symbol tokens', async () => {
    const module = await createTestingModule();

    expect(DATAVERSE_PROVIDERS).toHaveLength(2);
    expect(typeof AZURE_ACCESS_TOKEN_PROVIDER).toBe('symbol');
    expect(typeof DATAVERSE_ACCESS_TOKEN_PROVIDER).toBe('symbol');
    expect(module.get(AZURE_ACCESS_TOKEN_PROVIDER)).toBe(
      azureAccessTokenProvider,
    );
    expect(module.get(DATAVERSE_ACCESS_TOKEN_PROVIDER)).toBe(
      dataverseAccessTokenProvider,
    );
  });

  it('exports both provider tokens', async () => {
    const TOKEN_CONSUMER = Symbol('TOKEN_CONSUMER');

    @Module({
      imports: [DataverseModule],
      providers: [
        {
          provide: TOKEN_CONSUMER,
          inject: [
            AZURE_ACCESS_TOKEN_PROVIDER,
            DATAVERSE_ACCESS_TOKEN_PROVIDER,
          ],
          useFactory: (
            azureProvider: AzureAccessTokenProvider,
            dataverseProvider: DataverseAccessTokenProvider,
          ) => Object.freeze({ azureProvider, dataverseProvider }),
        },
      ],
    })
    class ConsumerModule {}

    const module = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    expect(module.get(TOKEN_CONSUMER)).toEqual({
      azureProvider: azureAccessTokenProvider,
      dataverseProvider: dataverseAccessTokenProvider,
    });
  });

  it('creates each transversal provider once per container', async () => {
    const module = await createTestingModule();

    expect(module.get(AZURE_ACCESS_TOKEN_PROVIDER)).toBe(
      module.get(AZURE_ACCESS_TOKEN_PROVIDER),
    );
    expect(module.get(DATAVERSE_ACCESS_TOKEN_PROVIDER)).toBe(
      module.get(DATAVERSE_ACCESS_TOKEN_PROVIDER),
    );
    expect(createAzureAccessTokenProvider).toHaveBeenCalledTimes(1);
    expect(createDataverseAccessTokenProvider).toHaveBeenCalledTimes(1);
  });

  it('shares the same Dataverse provider reference across consumer modules', async () => {
    const FIRST_CONSUMER = Symbol('FIRST_CONSUMER');
    const SECOND_CONSUMER = Symbol('SECOND_CONSUMER');

    @Module({
      imports: [DataverseModule],
      providers: [
        {
          provide: FIRST_CONSUMER,
          inject: [DATAVERSE_ACCESS_TOKEN_PROVIDER],
          useFactory: (provider: DataverseAccessTokenProvider) => provider,
        },
      ],
      exports: [FIRST_CONSUMER],
    })
    class FirstConsumerModule {}

    @Module({
      imports: [DataverseModule],
      providers: [
        {
          provide: SECOND_CONSUMER,
          inject: [DATAVERSE_ACCESS_TOKEN_PROVIDER],
          useFactory: (provider: DataverseAccessTokenProvider) => provider,
        },
      ],
      exports: [SECOND_CONSUMER],
    })
    class SecondConsumerModule {}

    const module = await Test.createTestingModule({
      imports: [FirstConsumerModule, SecondConsumerModule],
    }).compile();

    expect(module.get(FIRST_CONSUMER)).toBe(module.get(SECOND_CONSUMER));
    expect(module.get(FIRST_CONSUMER)).toBe(dataverseAccessTokenProvider);
    expect(createAzureAccessTokenProvider).toHaveBeenCalledTimes(1);
    expect(createDataverseAccessTokenProvider).toHaveBeenCalledTimes(1);
  });

  it('composes Azure Identity and Dataverse Auth with existing factories', async () => {
    await createTestingModule();

    expect(createAzureAccessTokenProvider).toHaveBeenCalledWith({
      tenantId: 'test-tenant-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
    expect(dataverseAccessTokenProviderDefinition.inject).toEqual([
      AZURE_ACCESS_TOKEN_PROVIDER,
    ]);
    expect(createDataverseAccessTokenProvider).toHaveBeenCalledWith({
      environmentUrl: ' https://example.crm.dynamics.com/// ',
      azureAccessTokenProvider,
    });
  });

  it('does not acquire tokens or fetch during composition', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await createTestingModule();

    expect(azureAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
    expect(dataverseAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('provides the same Dataverse token to both consumer factories', () => {
    expect(paymentNotificationRepositoryProviderDefinition.inject?.[0]).toBe(
      DATAVERSE_ACCESS_TOKEN_PROVIDER,
    );
    expect(
      authenticatedActorDataverseClientProviderDefinition.inject?.[0],
    ).toBe(DATAVERSE_ACCESS_TOKEN_PROVIDER);
  });

  it('is imported by both consumers without direct cross-dependency', () => {
    const paymentImports = Reflect.getMetadata(
      'imports',
      PaymentNotificationsModule,
    ) as unknown[];
    const actorImports = Reflect.getMetadata(
      'imports',
      AuthenticatedActorModule,
    ) as unknown[];

    expect(paymentImports).toEqual([DataverseModule]);
    expect(actorImports).toEqual([DataverseModule]);
    expect(actorImports).not.toContain(PaymentNotificationsModule);
  });

  it('does not duplicate feature modules in AppModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

    expect(
      imports.filter((module) => module === PaymentNotificationsModule),
    ).toHaveLength(1);
    expect(
      imports.filter((module) => module === AuthenticatedActorModule),
    ).toHaveLength(1);
    expect(imports.filter((module) => module === DataverseModule)).toHaveLength(
      0,
    );
  });

  it('does not perform I/O or use incoming JWT in production composition', () => {
    expect(productionSource).not.toMatch(
      /process\.env|JwtStrategy|passport|fetch\(|getAccessToken\(\)/i,
    );
  });

  it('uses the expected provider definitions', () => {
    expect(azureAccessTokenProviderDefinition.provide).toBe(
      AZURE_ACCESS_TOKEN_PROVIDER,
    );
    expect(azureAccessTokenProviderDefinition.inject).toBeUndefined();
    expect(dataverseAccessTokenProviderDefinition.provide).toBe(
      DATAVERSE_ACCESS_TOKEN_PROVIDER,
    );
  });
});
