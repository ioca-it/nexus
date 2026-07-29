import { ConfigurationError } from '../server/configuration-error';
import { readEnvironmentVariable } from '../server/environment-reader';
import type { EnvironmentVariables } from '../shared/environment-variables';

export const REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES = [
  'BUSINESS_CENTRAL_TENANT_ID',
  'BUSINESS_CENTRAL_CLIENT_ID',
  'BUSINESS_CENTRAL_CLIENT_SECRET',
  'BUSINESS_CENTRAL_RESOURCE_URL',
  'BUSINESS_CENTRAL_ENVIRONMENT_NAME',
  'BUSINESS_CENTRAL_COMPANY_ID',
  'BUSINESS_CENTRAL_API_VERSION',
] as const;

type BusinessCentralEnvironmentVariable =
  (typeof REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES)[number];

export type ValidatedBusinessCentralEnvironment = Readonly<
  Record<BusinessCentralEnvironmentVariable, string>
>;

export function validateBusinessCentralEnvironment(
  environment: EnvironmentVariables = process.env,
): ValidatedBusinessCentralEnvironment {
  const entries = REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES.map(
    (variableName) =>
      [
        variableName,
        readEnvironmentVariable(variableName, environment),
      ] as const,
  );
  const missingVariables = entries
    .filter(([, value]) => value === undefined)
    .map(([variableName]) => variableName);

  if (missingVariables.length > 0) {
    throw new ConfigurationError(missingVariables);
  }

  return Object.freeze(
    Object.fromEntries(entries) as ValidatedBusinessCentralEnvironment,
  );
}
