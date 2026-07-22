import type { EnvironmentVariables } from '../shared/environment-variables';
import type { AuthConfig } from './auth-config.types';
import { validateAuthEnvironment } from './auth-config.validator';

export const loadAuthConfig = (
  environment: EnvironmentVariables = process.env
): AuthConfig => {
  const { tenantId, clientId } = validateAuthEnvironment(environment);

  return {
    tenantId,
    clientId,
  };
};
