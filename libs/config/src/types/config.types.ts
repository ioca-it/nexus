import type { BusinessCentralConfig } from '../business-central/business-central-config.types';
import type { DataverseConfig } from '../dataverse/dataverse-config.types';
import type { PaymentNotificationsConfig } from '../payment-notifications/payment-notifications-config.types';
import type { OrdersConfig } from '../orders/orders-config.types';

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
  CommercialCatalogDataverseSchemaConfig,
  DataverseConfig,
  FinanceCustomerReferenceDataverseSchemaConfig,
  PaymentNotificationDataverseSchemaConfig,
} from '../dataverse/dataverse-config.types';
export type { BusinessCentralConfig } from '../business-central/business-central-config.types';

export interface ApplicationConfig {
  nodeEnv: string;
  appEnv: string;
  apiUrl: string;
  frontendUrl: string;
}

export type NexusDataverseConfig = Omit<
  DataverseConfig,
  'authenticatedActor' | 'commercialCatalog' | 'finance'
> & {
  readonly authenticatedActor?: DataverseConfig['authenticatedActor'];
  readonly commercialCatalog?: DataverseConfig['commercialCatalog'];
  readonly finance?: DataverseConfig['finance'];
};

export interface NexusConfig {
  application: ApplicationConfig;
  azure: AzureConfig;
  dataverse: NexusDataverseConfig;
  businessCentral: BusinessCentralConfig;
  readonly paymentNotifications?: PaymentNotificationsConfig;
  readonly orders?: OrdersConfig;
}
