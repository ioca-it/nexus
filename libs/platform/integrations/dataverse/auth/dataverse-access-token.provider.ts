import type {
  DataverseAccessTokenProvider,
  DataverseAccessTokenProviderDependencies,
} from './dataverse-access-token.types';

function createDataverseScope(environmentUrl: string): string {
  const normalizedEnvironmentUrl = environmentUrl.trim().replace(/\/+$/, '');
  if (normalizedEnvironmentUrl.length === 0) {
    throw new Error('environmentUrl is required');
  }

  return `${normalizedEnvironmentUrl}/.default`;
}

export class AzureDataverseAccessTokenProvider
  implements DataverseAccessTokenProvider
{
  private readonly scope: string;
  private readonly azureAccessTokenProvider: DataverseAccessTokenProviderDependencies['azureAccessTokenProvider'];

  constructor(dependencies: DataverseAccessTokenProviderDependencies) {
    this.scope = createDataverseScope(dependencies.environmentUrl);
    this.azureAccessTokenProvider = dependencies.azureAccessTokenProvider;
  }

  async getAccessToken(): Promise<string> {
    const accessToken = await this.azureAccessTokenProvider.getAccessToken({
      scope: this.scope,
    });

    return accessToken.token;
  }
}

export function createDataverseAccessTokenProvider(
  dependencies: DataverseAccessTokenProviderDependencies,
): DataverseAccessTokenProvider {
  return new AzureDataverseAccessTokenProvider(dependencies);
}
