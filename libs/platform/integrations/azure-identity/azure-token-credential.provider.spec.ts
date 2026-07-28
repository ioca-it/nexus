import { ClientSecretCredential } from '@azure/identity';

import type {
  AzureClientCredentialConfig,
  AzureTokenCredentialClient,
} from './azure-access-token.types';
import {
  AzureTokenCredentialProvider,
  createAzureAccessTokenProvider,
  createAzureTokenCredentialClient,
} from './azure-token-credential.provider';

jest.mock('@azure/identity', () => ({
  ClientSecretCredential: jest.fn(),
}));

const NOW = new Date('2026-07-27T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1_000;

function createCredentialClient(
  getToken: AzureTokenCredentialClient['getToken'] = jest.fn().mockResolvedValue({
    token: 'access-token',
    expiresOnTimestamp: NOW.getTime() + HOUR_MS,
  }),
): AzureTokenCredentialClient {
  return { getToken };
}

function createProvider(
  credentialClient: AzureTokenCredentialClient,
  options: {
    readonly clock?: () => Date;
    readonly renewalWindowMs?: number;
  } = {},
): AzureTokenCredentialProvider {
  return new AzureTokenCredentialProvider({
    credentialClient,
    clock: options.clock ?? (() => new Date(NOW.getTime())),
    renewalWindowMs: options.renewalWindowMs,
  });
}

describe('AzureTokenCredentialProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a valid token and converts expiresOnTimestamp to Date', async () => {
    const expiresOnTimestamp = NOW.getTime() + HOUR_MS;
    const getToken = jest.fn().mockResolvedValue({
      token: 'access-token',
      expiresOnTimestamp,
    });

    const result = await createProvider(createCredentialClient(getToken))
      .getAccessToken({ scope: 'scope-a' });

    expect(result).toEqual({
      token: 'access-token',
      expiresAt: new Date(expiresOnTimestamp),
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(getToken).toHaveBeenCalledWith('scope-a');
  });

  it('reuses a valid token for the same scope', async () => {
    const getToken = jest.fn().mockResolvedValue({
      token: 'access-token',
      expiresOnTimestamp: NOW.getTime() + HOUR_MS,
    });
    const provider = createProvider(createCredentialClient(getToken));

    await provider.getAccessToken({ scope: 'scope-a' });
    await provider.getAccessToken({ scope: 'scope-a' });

    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('keeps independent caches for different scopes', async () => {
    const getToken = jest.fn().mockImplementation(async (scope: string) => ({
      token: `token-for-${scope}`,
      expiresOnTimestamp: NOW.getTime() + HOUR_MS,
    }));
    const provider = createProvider(createCredentialClient(getToken));

    const first = await provider.getAccessToken({ scope: 'scope-a' });
    const second = await provider.getAccessToken({ scope: 'scope-b' });

    expect(first.token).toBe('token-for-scope-a');
    expect(second.token).toBe('token-for-scope-b');
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('renews a token that is inside the renewal window', async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce({
        token: 'expiring-token',
        expiresOnTimestamp: NOW.getTime() + 30_000,
      })
      .mockResolvedValueOnce({
        token: 'renewed-token',
        expiresOnTimestamp: NOW.getTime() + HOUR_MS,
      });
    const provider = createProvider(createCredentialClient(getToken), {
      renewalWindowMs: 60_000,
    });

    await provider.getAccessToken({ scope: 'scope-a' });
    const result = await provider.getAccessToken({ scope: 'scope-a' });

    expect(result.token).toBe('renewed-token');
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('shares one acquisition for concurrent requests of the same scope', async () => {
    let resolveToken:
      | ((value: {
          readonly token: string;
          readonly expiresOnTimestamp: number;
        }) => void)
      | undefined;
    const getToken = jest.fn(
      () =>
        new Promise<{
          readonly token: string;
          readonly expiresOnTimestamp: number;
        }>((resolve) => {
          resolveToken = resolve;
        }),
    );
    const provider = createProvider(createCredentialClient(getToken));

    const first = provider.getAccessToken({ scope: 'scope-a' });
    const second = provider.getAccessToken({ scope: 'scope-a' });
    resolveToken?.({
      token: 'shared-token',
      expiresOnTimestamp: NOW.getTime() + HOUR_MS,
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        token: 'shared-token',
        expiresAt: new Date(NOW.getTime() + HOUR_MS),
      },
      {
        token: 'shared-token',
        expiresAt: new Date(NOW.getTime() + HOUR_MS),
      },
    ]);
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('acquires concurrent requests for different scopes independently', async () => {
    const getToken = jest.fn().mockImplementation(async (scope: string) => ({
      token: scope,
      expiresOnTimestamp: NOW.getTime() + HOUR_MS,
    }));
    const provider = createProvider(createCredentialClient(getToken));

    const results = await Promise.all([
      provider.getAccessToken({ scope: 'scope-a' }),
      provider.getAccessToken({ scope: 'scope-b' }),
    ]);

    expect(results.map(({ token }) => token)).toEqual(['scope-a', 'scope-b']);
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed acquisition and permits a later retry', async () => {
    const acquisitionError = new Error('Azure acquisition failed');
    const getToken = jest
      .fn()
      .mockRejectedValueOnce(acquisitionError)
      .mockResolvedValueOnce({
        token: 'retry-token',
        expiresOnTimestamp: NOW.getTime() + HOUR_MS,
      });
    const provider = createProvider(createCredentialClient(getToken));

    await expect(
      provider.getAccessToken({ scope: 'scope-a' }),
    ).rejects.toBe(acquisitionError);
    await expect(
      provider.getAccessToken({ scope: 'scope-a' }),
    ).resolves.toMatchObject({ token: 'retry-token' });
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when Azure returns null', async () => {
    const provider = createProvider(
      createCredentialClient(jest.fn().mockResolvedValue(null)),
    );

    await expect(
      provider.getAccessToken({ scope: 'scope-a' }),
    ).rejects.toThrow('Azure did not return an access token');
  });

  it('rejects an empty scope without acquiring a token', async () => {
    const getToken = jest.fn();
    const provider = createProvider(createCredentialClient(getToken));

    await expect(provider.getAccessToken({ scope: '  ' })).rejects.toThrow(
      'scope is required',
    );
    expect(getToken).not.toHaveBeenCalled();
  });

  it('uses the configurable renewal window', async () => {
    const getToken = jest.fn().mockResolvedValue({
      token: 'access-token',
      expiresOnTimestamp: NOW.getTime() + 30_000,
    });
    const provider = createProvider(createCredentialClient(getToken), {
      renewalWindowMs: 0,
    });

    await provider.getAccessToken({ scope: 'scope-a' });
    await provider.getAccessToken({ scope: 'scope-a' });

    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('uses the injected clock to determine token validity', async () => {
    let currentTime = NOW.getTime();
    const clock = jest.fn(() => new Date(currentTime));
    const getToken = jest.fn().mockResolvedValue({
      token: 'access-token',
      expiresOnTimestamp: NOW.getTime() + HOUR_MS,
    });
    const provider = createProvider(createCredentialClient(getToken), {
      clock,
      renewalWindowMs: 60_000,
    });

    await provider.getAccessToken({ scope: 'scope-a' });
    currentTime = NOW.getTime() + HOUR_MS - 30_000;
    await provider.getAccessToken({ scope: 'scope-a' });

    expect(clock).toHaveBeenCalled();
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('returns defensive copies of token expiration dates', async () => {
    const provider = createProvider(createCredentialClient());

    const first = await provider.getAccessToken({ scope: 'scope-a' });
    first.expiresAt.setTime(0);
    const second = await provider.getAccessToken({ scope: 'scope-a' });

    expect(second.expiresAt.getTime()).toBe(NOW.getTime() + HOUR_MS);
    expect(second.expiresAt).not.toBe(first.expiresAt);
  });

  it('does not modify request inputs', async () => {
    const request = Object.freeze({ scope: 'scope-a' });
    const provider = createProvider(createCredentialClient());

    await provider.getAccessToken(request);

    expect(request).toEqual({ scope: 'scope-a' });
  });

  it('does not include an acquired token in provider-generated errors', async () => {
    const token = 'sensitive-access-token';
    const provider = createProvider(
      createCredentialClient(
        jest.fn().mockResolvedValue({
          token,
          expiresOnTimestamp: Number.NaN,
        }),
      ),
    );

    await expect(
      provider.getAccessToken({ scope: 'scope-a' }),
    ).rejects.not.toThrow(token);
  });
});

describe('Azure Identity factories', () => {
  const validConfig: AzureClientCredentialConfig = Object.freeze({
    tenantId: 'tenant-id',
    clientId: 'client-id',
    clientSecret: 'client-secret',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates ClientSecretCredential and adapts getToken', async () => {
    const getToken = jest.fn().mockResolvedValue({
      token: 'access-token',
      expiresOnTimestamp: NOW.getTime() + HOUR_MS,
    });
    const credentialConstructor = jest.mocked(ClientSecretCredential);
    credentialConstructor.mockImplementation(
      () => ({ getToken }) as unknown as ClientSecretCredential,
    );

    const client = createAzureTokenCredentialClient(validConfig);
    await expect(client.getToken('scope-a')).resolves.toMatchObject({
      token: 'access-token',
    });

    expect(credentialConstructor).toHaveBeenCalledWith(
      'tenant-id',
      'client-id',
      'client-secret',
    );
    expect(getToken).toHaveBeenCalledWith('scope-a');
  });

  it.each([
    ['tenantId', { tenantId: ' ' }],
    ['clientId', { clientId: ' ' }],
    ['clientSecret', { clientSecret: ' ' }],
  ] as const)('rejects an empty %s', (fieldName, override) => {
    expect(() =>
      createAzureTokenCredentialClient({ ...validConfig, ...override }),
    ).toThrow(`${fieldName} is required`);
  });

  it('does not expose the client secret in validation errors', () => {
    const secret = 'secret-that-must-not-appear';

    expect(() =>
      createAzureTokenCredentialClient({
        ...validConfig,
        tenantId: '',
        clientSecret: secret,
      }),
    ).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(secret),
      }),
    );
  });

  it('does not modify configuration inputs', () => {
    const credentialConstructor = jest.mocked(ClientSecretCredential);
    credentialConstructor.mockImplementation(
      () => ({ getToken: jest.fn() }) as unknown as ClientSecretCredential,
    );
    const originalConfig = { ...validConfig };

    createAzureTokenCredentialClient(validConfig);

    expect(validConfig).toEqual(originalConfig);
  });

  it('composes an AzureAccessTokenProvider with the official credential', async () => {
    const getToken = jest.fn().mockResolvedValue({
      token: 'access-token',
      expiresOnTimestamp: NOW.getTime() + HOUR_MS,
    });
    jest
      .mocked(ClientSecretCredential)
      .mockImplementation(
        () => ({ getToken }) as unknown as ClientSecretCredential,
      );

    const provider = createAzureAccessTokenProvider(validConfig, {
      clock: () => new Date(NOW.getTime()),
    });

    await expect(
      provider.getAccessToken({ scope: 'scope-a' }),
    ).resolves.toMatchObject({ token: 'access-token' });
  });
});
