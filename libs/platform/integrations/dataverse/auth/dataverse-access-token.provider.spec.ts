import type { AzureAccessTokenProvider } from '../../azure-identity';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AzureDataverseAccessTokenProvider,
  createDataverseAccessTokenProvider,
} from './dataverse-access-token.provider';
import type { DataverseAccessTokenProviderDependencies } from './dataverse-access-token.types';

const EXPIRES_AT = new Date('2026-07-27T13:00:00.000Z');
const PROVIDER_SOURCE = readFileSync(
  join(__dirname, 'dataverse-access-token.provider.ts'),
  'utf8',
);

function createAzureAccessTokenProvider(
  getAccessToken: AzureAccessTokenProvider['getAccessToken'] = jest
    .fn()
    .mockResolvedValue({
      token: 'dataverse-token',
      expiresAt: EXPIRES_AT,
    }),
): AzureAccessTokenProvider {
  return { getAccessToken };
}

function createDependencies(
  environmentUrl = 'https://example.crm.dynamics.com',
  azureAccessTokenProvider = createAzureAccessTokenProvider(),
): DataverseAccessTokenProviderDependencies {
  return {
    environmentUrl,
    azureAccessTokenProvider,
  };
}

describe('AzureDataverseAccessTokenProvider', () => {
  it('builds the Dataverse scope with /.default', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'dataverse-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(
        'https://example.crm.dynamics.com',
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledWith({
      scope: 'https://example.crm.dynamics.com/.default',
    });
  });

  it('removes one trailing slash from environmentUrl', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'dataverse-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(
        'https://example.crm.dynamics.com/',
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledWith({
      scope: 'https://example.crm.dynamics.com/.default',
    });
  });

  it('removes multiple trailing slashes from environmentUrl', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'dataverse-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(
        'https://example.crm.dynamics.com///',
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledWith({
      scope: 'https://example.crm.dynamics.com/.default',
    });
  });

  it('removes external spaces from environmentUrl', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'dataverse-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(
        '  https://example.crm.dynamics.com/  ',
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledWith({
      scope: 'https://example.crm.dynamics.com/.default',
    });
  });

  it.each(['', '   '])(
    'rejects an empty environmentUrl represented by %p',
    (environmentUrl) => {
      expect(
        () =>
          new AzureDataverseAccessTokenProvider(
            createDependencies(environmentUrl),
          ),
      ).toThrow('environmentUrl is required');
    },
  );

  it('rejects an environmentUrl containing only trailing slashes', () => {
    expect(
      () =>
        new AzureDataverseAccessTokenProvider(createDependencies(' /// ')),
    ).toThrow('environmentUrl is required');
  });

  it('returns only the token string', async () => {
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(),
    );

    await expect(provider.getAccessToken()).resolves.toBe('dataverse-token');
  });

  it('executes AzureAccessTokenProvider exactly once per call', async () => {
    const getAccessToken = jest.fn().mockResolvedValue({
      token: 'dataverse-token',
      expiresAt: EXPIRES_AT,
    });
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(
        'https://example.crm.dynamics.com',
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await provider.getAccessToken();

    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('propagates Azure Identity errors without transforming them', async () => {
    const acquisitionError = new Error('Azure acquisition failed');
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(
        'https://example.crm.dynamics.com',
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
    const provider = new AzureDataverseAccessTokenProvider(
      createDependencies(
        'https://example.crm.dynamics.com',
        createAzureAccessTokenProvider(getAccessToken),
      ),
    );

    await expect(provider.getAccessToken()).resolves.toBe('first-token');
    await expect(provider.getAccessToken()).resolves.toBe('second-token');
    expect(getAccessToken).toHaveBeenCalledTimes(2);
  });

  it('does not modify its dependencies', () => {
    const dependencies = Object.freeze(createDependencies());
    const originalEnvironmentUrl = dependencies.environmentUrl;
    const originalProvider = dependencies.azureAccessTokenProvider;

    new AzureDataverseAccessTokenProvider(dependencies);

    expect(dependencies.environmentUrl).toBe(originalEnvironmentUrl);
    expect(dependencies.azureAccessTokenProvider).toBe(originalProvider);
  });

  it('creates the provider through the public factory', async () => {
    const provider = createDataverseAccessTokenProvider(createDependencies());

    expect(provider).toBeInstanceOf(AzureDataverseAccessTokenProvider);
    await expect(provider.getAccessToken()).resolves.toBe('dataverse-token');
  });

  it('does not depend on NestJS', () => {
    expect(PROVIDER_SOURCE).not.toMatch(/@nestjs/);
  });

  it('does not depend on Payment Notifications', () => {
    expect(PROVIDER_SOURCE).not.toMatch(/payment-notifications/i);
  });

  it('does not use incoming JWT or client credentials directly', () => {
    expect(PROVIDER_SOURCE).not.toMatch(
      /ClientSecretCredential|clientSecret|clientId|tenantId|JwtStrategy|passport/,
    );
  });
});
