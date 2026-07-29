import type { EnvironmentVariables } from '../shared/environment-variables';
import type { BusinessCentralConfig } from './business-central-config.types';
import { validateBusinessCentralEnvironment } from './business-central-config.validator';

export function loadBusinessCentralConfig(
  environment: EnvironmentVariables = process.env,
): BusinessCentralConfig {
  const values = validateBusinessCentralEnvironment(environment);

  return Object.freeze({
    tenantId: values.BUSINESS_CENTRAL_TENANT_ID,
    clientId: values.BUSINESS_CENTRAL_CLIENT_ID,
    clientSecret: values.BUSINESS_CENTRAL_CLIENT_SECRET,
    resourceUrl: values.BUSINESS_CENTRAL_RESOURCE_URL,
    environmentName: values.BUSINESS_CENTRAL_ENVIRONMENT_NAME,
    companyId: values.BUSINESS_CENTRAL_COMPANY_ID,
    apiVersion: values.BUSINESS_CENTRAL_API_VERSION,
  });
}
