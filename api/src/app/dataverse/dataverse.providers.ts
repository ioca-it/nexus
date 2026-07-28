import type { FactoryProvider, Provider } from '@nestjs/common';
import { getAppConfig } from '@nexus/config';
import {
  createAzureAccessTokenProvider,
  createDataverseAccessTokenProvider,
  type AzureAccessTokenProvider,
  type DataverseAccessTokenProvider,
} from '@nexus/platform';

import {
  AZURE_ACCESS_TOKEN_PROVIDER,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
} from './dataverse.tokens';

export const azureAccessTokenProviderDefinition: FactoryProvider<AzureAccessTokenProvider> =
  {
    provide: AZURE_ACCESS_TOKEN_PROVIDER,
    useFactory: () => {
      const { tenantId, clientId, clientSecret } = getAppConfig().azure;

      return createAzureAccessTokenProvider({
        tenantId,
        clientId,
        clientSecret,
      });
    },
  };

export const dataverseAccessTokenProviderDefinition: FactoryProvider<DataverseAccessTokenProvider> =
  {
    provide: DATAVERSE_ACCESS_TOKEN_PROVIDER,
    inject: [AZURE_ACCESS_TOKEN_PROVIDER],
    useFactory: (azureAccessTokenProvider: AzureAccessTokenProvider) => {
      const { environmentUrl } = getAppConfig().dataverse;

      return createDataverseAccessTokenProvider({
        environmentUrl,
        azureAccessTokenProvider,
      });
    },
  };

// Opti ChatGPT: composición singleton compartida para evitar proveedores de autenticación duplicados.
export const DATAVERSE_PROVIDERS: Provider[] = [
  azureAccessTokenProviderDefinition,
  dataverseAccessTokenProviderDefinition,
];
