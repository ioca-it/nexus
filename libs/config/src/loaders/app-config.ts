import type { NexusConfig } from '../types/config.types';
import { envLoader } from './env-loader';

export const loadAppConfig = (): NexusConfig => ({
  application: {
    nodeEnv: envLoader.getOptional('NODE_ENV', 'development'),
    appEnv: envLoader.getOptional('APP_ENV', 'development'),
    apiUrl: envLoader.getRequired('API_URL'),
    frontendUrl: envLoader.getRequired('FRONTEND_URL'),
  },
  azure: {
    tenantId: envLoader.getRequired('AZURE_TENANT_ID'),
    clientId: envLoader.getRequired('AZURE_CLIENT_ID'),
    clientSecret: envLoader.getRequired('AZURE_CLIENT_SECRET'),
    keyVaultUrl: envLoader.getRequired('AZURE_KEY_VAULT_URL'),
    storageAccountName: envLoader.getRequired('AZURE_STORAGE_ACCOUNT_NAME'),
    applicationInsightsConnectionString: envLoader.getOptional(
      'APPLICATIONINSIGHTS_CONNECTION_STRING'
    ),
  },
  dataverse: {
    environmentUrl: envLoader.getRequired('DATAVERSE_ENVIRONMENT_URL'),
    apiVersion: envLoader.getOptional('DATAVERSE_API_VERSION', 'v9.2'),
  },
  businessCentral: {
    tenantId: envLoader.getRequired('BC_TENANT_ID'),
    environment: envLoader.getRequired('BC_ENVIRONMENT'),
    companyId: envLoader.getRequired('BC_COMPANY_ID'),
  },
});
