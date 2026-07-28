export interface AzureClientCredentialConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface AzureAccessTokenRequest {
  readonly scope: string;
}

export interface AzureAccessToken {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface AzureAccessTokenProvider {
  getAccessToken(request: AzureAccessTokenRequest): Promise<AzureAccessToken>;
}

export interface AzureTokenCredentialClient {
  getToken(scope: string): Promise<{
    readonly token: string;
    readonly expiresOnTimestamp: number;
  } | null>;
}
