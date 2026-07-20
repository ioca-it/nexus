export interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  keyVaultUrl: string;
  storageAccountName: string;
  applicationInsightsConnectionString: string;
}

export interface DataverseConfig {
  environmentUrl: string;
  apiVersion: string;
}

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

export interface NexusConfig {
  application: ApplicationConfig;
  azure: AzureConfig;
  dataverse: DataverseConfig;
  businessCentral: BusinessCentralConfig;
}
