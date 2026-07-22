import { ConfigurationError } from '../server/configuration-error';
import type { EnvironmentVariables } from '../shared/environment-variables';
import { loadAuthConfig } from './auth-config.loader';
import { createAuthConfigService } from './auth-config.service';
import { validateAuthEnvironment } from './auth-config.validator';

const validEnvironment: EnvironmentVariables = {
  AZURE_TENANT_ID: 'tenant-id',
  AZURE_CLIENT_ID: 'client-id',
};

describe('Auth configuration', () => {
  it('loads and trims only the Auth configuration', () => {
    const environment: EnvironmentVariables = {
      ...validEnvironment,
      AZURE_TENANT_ID: ' tenant-id ',
      AZURE_CLIENT_ID: ' client-id ',
    };

    expect(loadAuthConfig(environment)).toEqual({
      tenantId: 'tenant-id',
      clientId: 'client-id',
    });
  });

  it('does not require configuration from unrelated modules', () => {
    expect(() => validateAuthEnvironment(validEnvironment)).not.toThrow();
  });

  it('reports every missing Auth environment variable', () => {
    const environment: EnvironmentVariables = {
      AZURE_TENANT_ID: ' ',
    };

    expect(() => validateAuthEnvironment(environment)).toThrow(
      new ConfigurationError(['AZURE_TENANT_ID', 'AZURE_CLIENT_ID'])
    );
  });

  it('caches the Auth configuration after the first load', () => {
    const config = { tenantId: 'tenant-id', clientId: 'client-id' };
    const loader = jest.fn(() => config);
    const service = createAuthConfigService(loader);

    expect(service.getConfig()).toBe(config);
    expect(service.getConfig()).toBe(config);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
