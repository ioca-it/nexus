import { REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES } from '../business-central/business-central-config.validator';
import { REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES } from '../dataverse/dataverse-config.validator';
import { REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES } from '../payment-notifications/payment-notifications-config.validator';

const REQUIRED_ENV_VARS = [
  'API_URL',
  'FRONTEND_URL',
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_KEY_VAULT_URL',
  'AZURE_STORAGE_ACCOUNT_NAME',
  ...REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES,
  ...REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES,
  ...REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES,
] as const;

export const validateRequiredEnvironmentVariables = (): void => {
  const missingVariables = REQUIRED_ENV_VARS.filter(
    (variableName) => !process.env[variableName]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`,
    );
  }
};
