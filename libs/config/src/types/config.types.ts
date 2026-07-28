import type { DataverseConfig } from '../dataverse/dataverse-config.types';
import type { PaymentNotificationsConfig } from '../payment-notifications/payment-notifications-config.types';

export interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  keyVaultUrl: string;
  storageAccountName: string;
  applicationInsightsConnectionString: string;
}

export type {
  AuthenticatedActorDataverseSchemaConfig,
  DataverseConfig,
  PaymentNotificationDataverseSchemaConfig,
} from '../dataverse/dataverse-config.types';

export interface BusinessCentralConfig {
  tenantId: string;
  environment: string;
  companyId: string;
}

export interface ApplicationConfig {
  nodeEnv: string;
  appEnv: string;
  apiUrl: string;
  frontendUrl: string;
}

export type NexusDataverseConfig = Omit<
  DataverseConfig,
  'authenticatedActor'
> & {
  readonly authenticatedActor?: DataverseConfig['authenticatedActor'];
};

export interface NexusConfig {
  application: ApplicationConfig;
  azure: AzureConfig;
  dataverse: NexusDataverseConfig;
  businessCentral: BusinessCentralConfig;
  readonly paymentNotifications?: PaymentNotificationsConfig;
}
