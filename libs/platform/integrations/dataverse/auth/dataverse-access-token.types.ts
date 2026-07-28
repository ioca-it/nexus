import type { AzureAccessTokenProvider } from '../../azure-identity';

export interface DataverseAccessTokenProvider {
  getAccessToken(): Promise<string>;
}

export interface DataverseAccessTokenProviderDependencies {
  readonly environmentUrl: string;
  readonly azureAccessTokenProvider: AzureAccessTokenProvider;
}
