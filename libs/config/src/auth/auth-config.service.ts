import { loadAuthConfig } from './auth-config.loader';
import type { AuthConfig } from './auth-config.types';

type AuthConfigLoader = () => AuthConfig;

interface AuthConfigService {
  getConfig(): AuthConfig;
}

export const createAuthConfigService = (
  loader: AuthConfigLoader
): AuthConfigService => {
  let cachedConfig: AuthConfig | undefined;

  return {
    getConfig: (): AuthConfig => {
      cachedConfig ??= loader();

      return cachedConfig;
    },
  };
};

const authConfigService = createAuthConfigService(loadAuthConfig);

export const getAuthConfig = (): AuthConfig => authConfigService.getConfig();
