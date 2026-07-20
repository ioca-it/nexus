const REQUIRED_ENV_VARS = [
  'API_URL',
  'FRONTEND_URL',
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_KEY_VAULT_URL',
  'AZURE_STORAGE_ACCOUNT_NAME',
  'DATAVERSE_ENVIRONMENT_URL',
  'BC_TENANT_ID',
  'BC_ENVIRONMENT',
  'BC_COMPANY_ID',
] as const;

export const validateRequiredEnvironmentVariables = (): void => {
  const missingVariables = REQUIRED_ENV_VARS.filter(
    (variableName) => !process.env[variableName]?.trim()
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`
    );
  }
};
