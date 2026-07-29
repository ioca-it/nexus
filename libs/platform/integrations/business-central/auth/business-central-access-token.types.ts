import type { AzureAccessTokenProvider } from '../../azure-identity';

export interface BusinessCentralAccessTokenProvider {
  getAccessToken(): Promise<string>;
}

export interface BusinessCentralAccessTokenProviderDependencies {
  readonly resourceUrl: string;
  readonly azureAccessTokenProvider: AzureAccessTokenProvider;
}
