import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AzureAccessTokenProvider } from '../../azure-identity';
import {
  AzureBusinessCentralAccessTokenProvider as PublicAzureBusinessCentralAccessTokenProvider,
  createBusinessCentralAccessTokenProvider as createPublicBusinessCentralAccessTokenProvider,
  type BusinessCentralAccessTokenProvider as PublicBusinessCentralAccessTokenProvider,
} from '../../../index';
import {
  AzureBusinessCentralAccessTokenProvider,
  createBusinessCentralAccessTokenProvider,
} from './business-central-access-token.provider';
import type {
  BusinessCentralAccessTokenProvider,
  BusinessCentralAccessTokenProviderDependencies,
} from './business-central-access-token.types';

const EXPIRES_AT = new Date('2026-07-28T13:00:00.000Z');
const RESOURCE_URL = 'https://resource.example';
const PROVIDER_SOURCE = readFileSync(
  join(__dirname, 'business-central-access-token.provider.ts'),
  'utf8',
);
const TYPES_SOURCE = readFileSync(
  join(__dirname, 'business-central-access-token.types.ts'),
  'utf8',
);

function createAzureAccessTokenProvider(
  getAccessToken: AzureAccessTokenProvider['getAccessToken'] = jest
    .fn()
    .mockResolvedValue({
      token: 'outbound-token',
      expiresAt: EXPIRES_AT,
    }),
): AzureAccessTokenProvider {
  return { getAccessToken };
}

function createDependencies(
  resourceUrl = RESOURCE_URL,
  azureAccessTokenProvider = createAzureAccessTokenProvider(),
): BusinessCentralAccessTokenProviderDependencies {
  return {
    resourceUrl,
    azureAccessTokenProvider,
  };
}

describe('AzureBusinessCentralAccessTokenProvider', () => {
  it('builds the resource scope with /.default', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'outbound-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureBusinessCentralAccessTokenProvider(
      createDependencies(
        RESOURCE_URL,
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledWith({
      scope: `${RESOURCE_URL}/.default`,
    });
  });

  it('trims the resourceUrl', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'outbound-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureBusinessCentralAccessTokenProvider(
      createDependencies(
        `  ${RESOURCE_URL}  `,
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledWith({
      scope: `${RESOURCE_URL}/.default`,
    });
  });

  it.each([
    [`${RESOURCE_URL}/`, 'one'],
    [`${RESOURCE_URL}///`, 'multiple'],
  ])('removes %s trailing slash variants (%s)', async (resourceUrl) => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'outbound-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureBusinessCentralAccessTokenProvider(
      createDependencies(
        resourceUrl,
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledWith({
      scope: `${RESOURCE_URL}/.default`,
    });
  });

  it.each(['', '   ', ' /// '])(
    'rejects an invalid resourceUrl represented by %p',
    (resourceUrl) => {
      expect(
        () =>
          new AzureBusinessCentralAccessTokenProvider(
            createDependencies(resourceUrl),
          ),
      ).toThrow('resourceUrl is required');
    },
  );

  it('returns only the token string', async () => {
    const provider = new AzureBusinessCentralAccessTokenProvider(
      createDependencies(),
    );

    await expect(provider.getAccessToken()).resolves.toBe('outbound-token');
  });

  it('delegates exactly once per call', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'outbound-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureBusinessCentralAccessTokenProvider(
      createDependencies(
        RESOURCE_URL,
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('propagates Azure Identity errors without transforming them', async () => {
    const acquisitionError = new Error('Token acquisition failed');
    const provider = new AzureBusinessCentralAccessTokenProvider(
      createDependencies(
        RESOURCE_URL,
        createAzureAccessTokenProvider(
          jest.fn().mockRejectedValue(acquisitionError),
        ),
      ),
    );

    await expect(provider.getAccessToken()).rejects.toBe(acquisitionError);
  });

  it('does not add a token cache', async () => {
    const getAccessToken = jest
      .fn()
      .mockResolvedValueOnce({
        token: 'first-token',
        expiresAt: EXPIRES_AT,
      })
      .mockResolvedValueOnce({
        token: 'second-token',
        expiresAt: EXPIRES_AT,
      });
    const provider = new AzureBusinessCentralAccessTokenProvider(
      createDependencies(
        RESOURCE_URL,
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await expect(provider.getAccessToken()).resolves.toBe('first-token');
    await expect(provider.getAccessToken()).resolves.toBe('second-token');
    expect(getAccessToken).toHaveBeenCalledTimes(2);
  });

  it('does not modify its dependencies', () => {
    const azureAccessTokenProvider = createAzureAccessTokenProvider();
    const dependencies = Object.freeze(
      createDependencies(`  ${RESOURCE_URL}/  `, azureAccessTokenProvider),
    );

    new AzureBusinessCentralAccessTokenProvider(dependencies);

    expect(dependencies.resourceUrl).toBe(`  ${RESOURCE_URL}/  `);
    expect(dependencies.azureAccessTokenProvider).toBe(
      azureAccessTokenProvider,
    );
  });

  it('creates the provider through the public factory', async () => {
    const provider: BusinessCentralAccessTokenProvider =
      createBusinessCentralAccessTokenProvider(createDependencies());

    expect(provider).toBeInstanceOf(AzureBusinessCentralAccessTokenProvider);
    await expect(provider.getAccessToken()).resolves.toBe('outbound-token');
  });

  it('exports the provider contracts through the public Platform entry point', async () => {
    const provider: PublicBusinessCentralAccessTokenProvider =
      createPublicBusinessCentralAccessTokenProvider(createDependencies());

    expect(provider).toBeInstanceOf(
      PublicAzureBusinessCentralAccessTokenProvider,
    );
    await expect(provider.getAccessToken()).resolves.toBe('outbound-token');
  });

  it('does not receive credentials or create credential infrastructure', () => {
    expect(`${TYPES_SOURCE}\n${PROVIDER_SOURCE}`).not.toMatch(
      /ClientSecretCredential|clientSecret|clientId|tenantId/i,
    );
  });

  it('does not use incoming JWT, environment variables, or manual OAuth', () => {
    expect(PROVIDER_SOURCE).not.toMatch(
      /JwtStrategy|passport|authorization_code|client_credentials|grant_type|oauth|process\.env/i,
    );
  });

  it('does not depend on NestJS, Dataverse, or Payment Notifications', () => {
    expect(PROVIDER_SOURCE).not.toMatch(
      /@nestjs|Dataverse|payment-notifications/i,
    );
  });
});
