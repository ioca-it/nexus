import { ClientSecretCredential } from '@azure/identity';

import type {
  AzureAccessToken,
  AzureAccessTokenProvider,
  AzureAccessTokenRequest,
  AzureClientCredentialConfig,
  AzureTokenCredentialClient,
} from './azure-access-token.types';

const DEFAULT_RENEWAL_WINDOW_MS = 120_000;

interface CachedAccessToken {
  readonly token: string;
  readonly expiresAt: Date;
}

function requireNonEmpty(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

function copyAccessToken(accessToken: CachedAccessToken): AzureAccessToken {
  return Object.freeze({
    token: accessToken.token,
    expiresAt: new Date(accessToken.expiresAt.getTime()),
  });
}

export class AzureTokenCredentialProvider
  implements AzureAccessTokenProvider
{
  private readonly credentialClient: AzureTokenCredentialClient;
  private readonly clock: () => Date;
  private readonly renewalWindowMs: number;
  private readonly cache = new Map<string, CachedAccessToken>();
  private readonly acquisitions = new Map<string, Promise<CachedAccessToken>>();

  constructor(dependencies: {
    readonly credentialClient: AzureTokenCredentialClient;
    readonly clock?: () => Date;
    readonly renewalWindowMs?: number;
  }) {
    if (dependencies.credentialClient === undefined) {
      throw new Error('credentialClient is required');
    }

    const renewalWindowMs =
      dependencies.renewalWindowMs ?? DEFAULT_RENEWAL_WINDOW_MS;
    if (!Number.isFinite(renewalWindowMs) || renewalWindowMs < 0) {
      throw new Error('renewalWindowMs must be a non-negative finite number');
    }

    this.credentialClient = dependencies.credentialClient;
    this.clock = dependencies.clock ?? (() => new Date());
    this.renewalWindowMs = renewalWindowMs;
  }

  async getAccessToken(
    request: AzureAccessTokenRequest,
  ): Promise<AzureAccessToken> {
    requireNonEmpty(request.scope, 'scope');

    const cached = this.cache.get(request.scope);
    if (
      cached !== undefined &&
      cached.expiresAt.getTime() - this.renewalWindowMs >
        this.clock().getTime()
    ) {
      return copyAccessToken(cached);
    }

    // Opti ChatGPT: caché y adquisición concurrente compartida por scope para evitar solicitudes duplicadas.
    let acquisition = this.acquisitions.get(request.scope);
    if (acquisition === undefined) {
      acquisition = this.acquireAccessToken(request.scope);
      this.acquisitions.set(request.scope, acquisition);
    }

    try {
      return copyAccessToken(await acquisition);
    } finally {
      if (this.acquisitions.get(request.scope) === acquisition) {
        this.acquisitions.delete(request.scope);
      }
    }
  }

  private async acquireAccessToken(scope: string): Promise<CachedAccessToken> {
    const acquired = await this.credentialClient.getToken(scope);
    if (acquired === null) {
      throw new Error('Azure did not return an access token');
    }

    const expiresAt = new Date(acquired.expiresOnTimestamp);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new Error('Azure returned an invalid token expiration');
    }

    const accessToken: CachedAccessToken = Object.freeze({
      token: acquired.token,
      expiresAt,
    });
    this.cache.set(scope, accessToken);

    return accessToken;
  }
}

export function createAzureTokenCredentialClient(
  config: AzureClientCredentialConfig,
): AzureTokenCredentialClient {
  requireNonEmpty(config.tenantId, 'tenantId');
  requireNonEmpty(config.clientId, 'clientId');
  requireNonEmpty(config.clientSecret, 'clientSecret');

  const credential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret,
  );

  return Object.freeze({
    async getToken(scope: string) {
      return credential.getToken(scope);
    },
  });
}

export function createAzureAccessTokenProvider(
  config: AzureClientCredentialConfig,
  options: {
    readonly clock?: () => Date;
    readonly renewalWindowMs?: number;
  } = {},
): AzureAccessTokenProvider {
  return new AzureTokenCredentialProvider({
    credentialClient: createAzureTokenCredentialClient(config),
    clock: options.clock,
    renewalWindowMs: options.renewalWindowMs,
  });
}
