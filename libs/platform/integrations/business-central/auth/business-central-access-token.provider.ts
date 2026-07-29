import type {
  BusinessCentralAccessTokenProvider,
  BusinessCentralAccessTokenProviderDependencies,
} from './business-central-access-token.types';

function createBusinessCentralScope(resourceUrl: string): string {
  const normalizedResourceUrl = resourceUrl.trim().replace(/\/+$/, '');
  if (normalizedResourceUrl.length === 0) {
    throw new Error('resourceUrl is required');
  }

  return `${normalizedResourceUrl}/.default`;
}

export class AzureBusinessCentralAccessTokenProvider
  implements BusinessCentralAccessTokenProvider
{
  private readonly scope: string;
  private readonly azureAccessTokenProvider: BusinessCentralAccessTokenProviderDependencies['azureAccessTokenProvider'];

  constructor(dependencies: BusinessCentralAccessTokenProviderDependencies) {
    this.scope = createBusinessCentralScope(dependencies.resourceUrl);
    this.azureAccessTokenProvider = dependencies.azureAccessTokenProvider;
  }

  async getAccessToken(): Promise<string> {
    const accessToken = await this.azureAccessTokenProvider.getAccessToken({
      scope: this.scope,
    });

    return accessToken.token;
  }
}

export function createBusinessCentralAccessTokenProvider(
  dependencies: BusinessCentralAccessTokenProviderDependencies,
): BusinessCentralAccessTokenProvider {
  return new AzureBusinessCentralAccessTokenProvider(dependencies);
}
