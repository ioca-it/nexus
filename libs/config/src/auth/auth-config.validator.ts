import { ConfigurationError } from '../server/configuration-error';
import { readEnvironmentVariable } from '../server/environment-reader';
import type { EnvironmentVariables } from '../shared/environment-variables';

interface ValidatedAuthEnvironment {
  tenantId: string;
  clientId: string;
}

export const validateAuthEnvironment = (
  environment: EnvironmentVariables = process.env
): ValidatedAuthEnvironment => {
  const tenantId = readEnvironmentVariable('AZURE_TENANT_ID', environment);
  const clientId = readEnvironmentVariable('AZURE_CLIENT_ID', environment);

  if (tenantId === undefined || clientId === undefined) {
    const missingVariables = [
      ...(tenantId === undefined ? ['AZURE_TENANT_ID'] : []),
      ...(clientId === undefined ? ['AZURE_CLIENT_ID'] : []),
    ];

    throw new ConfigurationError(missingVariables);
  }

  return { tenantId, clientId };
};
