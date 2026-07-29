import { REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES } from '../dataverse/dataverse-config.validator';
import { loadAppConfig } from '../loaders/app-config';
import { REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES } from '../payment-notifications/payment-notifications-config.validator';
import { ConfigurationError } from '../server/configuration-error';
import { getAppConfig } from '../services/config.service';
import type { EnvironmentVariables } from '../shared/environment-variables';
import {
  loadBusinessCentralConfig as publicLoadBusinessCentralConfig,
  type BusinessCentralConfig as PublicBusinessCentralConfig,
} from '../index';
import { loadBusinessCentralConfig } from './business-central-config.loader';
import type { BusinessCentralConfig } from './business-central-config.types';
import {
  REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES,
  validateBusinessCentralEnvironment,
} from './business-central-config.validator';

const validBusinessCentralEnvironment: EnvironmentVariables = Object.freeze({
  BUSINESS_CENTRAL_TENANT_ID: 'test-bc-tenant',
  BUSINESS_CENTRAL_CLIENT_ID: 'test-bc-client',
  BUSINESS_CENTRAL_CLIENT_SECRET: 'test-bc-secret',
  BUSINESS_CENTRAL_RESOURCE_URL: 'https://resource.example.test',
  BUSINESS_CENTRAL_ENVIRONMENT_NAME: 'test-environment',
  BUSINESS_CENTRAL_COMPANY_ID: 'test-company',
  BUSINESS_CENTRAL_API_VERSION: 'test-version',
});

const expectedBusinessCentralConfig: BusinessCentralConfig = Object.freeze({
  tenantId: 'test-bc-tenant',
  clientId: 'test-bc-client',
  clientSecret: 'test-bc-secret',
  resourceUrl: 'https://resource.example.test',
  environmentName: 'test-environment',
  companyId: 'test-company',
  apiVersion: 'test-version',
});

const completeApplicationEnvironment: EnvironmentVariables = Object.freeze({
  ...Object.fromEntries(
    REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES.map((variableName) => [
      variableName,
      `test_${variableName.toLowerCase()}`,
    ]),
  ),
  ...Object.fromEntries(
    REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES.map(
      (variableName) => [variableName, `test_${variableName.toLowerCase()}`],
    ),
  ),
  ...validBusinessCentralEnvironment,
  NODE_ENV: 'test',
  APP_ENV: 'development',
  API_URL: 'https://api.example.test',
  FRONTEND_URL: 'https://portal.example.test',
  AZURE_TENANT_ID: 'test-primary-tenant',
  AZURE_CLIENT_ID: 'test-primary-client',
  AZURE_CLIENT_SECRET: 'test-primary-secret',
  AZURE_KEY_VAULT_URL: 'https://vault.example.test',
  AZURE_STORAGE_ACCOUNT_NAME: 'teststorage',
});

function withProcessEnvironment<T>(
  environment: EnvironmentVariables,
  action: () => T,
): T {
  const originalValues = new Map(
    Object.keys(environment).map((variableName) => [
      variableName,
      process.env[variableName],
    ]),
  );

  for (const [variableName, value] of Object.entries(environment)) {
    if (value !== undefined) {
      process.env[variableName] = value;
    }
  }

  try {
    return action();
  } finally {
    for (const [variableName, value] of originalValues) {
      if (value === undefined) {
        delete process.env[variableName];
      } else {
        process.env[variableName] = value;
      }
    }
  }
}

describe('Business Central configuration', () => {
  it('loads every required value', () => {
    expect(loadBusinessCentralConfig(validBusinessCentralEnvironment)).toEqual(
      expectedBusinessCentralConfig,
    );
  });

  it('trims every value', () => {
    const paddedEnvironment = Object.freeze(
      Object.fromEntries(
        Object.entries(validBusinessCentralEnvironment).map(([name, value]) => [
          name,
          `  ${value}  `,
        ]),
      ),
    );

    expect(loadBusinessCentralConfig(paddedEnvironment)).toEqual(
      expectedBusinessCentralConfig,
    );
  });

  it.each(REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES)(
    'reports an absent required variable clearly: %s',
    (variableName) => {
      const environment = { ...validBusinessCentralEnvironment };
      delete environment[variableName];

      expect(() => validateBusinessCentralEnvironment(environment)).toThrow(
        new ConfigurationError([variableName]),
      );
    },
  );

  it.each(
    REQUIRED_BUSINESS_CENTRAL_ENVIRONMENT_VARIABLES.flatMap((variableName) => [
      [variableName, ''],
      [variableName, '   '],
    ]),
  )('rejects an empty value: %s = %p', (variableName, value) => {
    expect(() =>
      loadBusinessCentralConfig({
        ...validBusinessCentralEnvironment,
        [variableName]: value,
      }),
    ).toThrow(new ConfigurationError([variableName]));
  });

  it('does not expose the client secret in validation errors', () => {
    const secret = 'secret-that-must-not-appear';

    try {
      loadBusinessCentralConfig({
        ...validBusinessCentralEnvironment,
        BUSINESS_CENTRAL_TENANT_ID: undefined,
        BUSINESS_CENTRAL_CLIENT_SECRET: secret,
      });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).toContain('BUSINESS_CENTRAL_TENANT_ID');
    }
  });

  it('returns a deeply frozen configuration', () => {
    const config = loadBusinessCentralConfig(validBusinessCentralEnvironment);

    expect(Object.isFrozen(config)).toBe(true);
  });

  it('does not modify the provided environment', () => {
    const environment = Object.freeze({
      ...validBusinessCentralEnvironment,
    });
    const originalEnvironment = { ...environment };

    loadBusinessCentralConfig(environment);

    expect(environment).toEqual(originalEnvironment);
  });

  it('exposes the complete structure through getAppConfig()', () => {
    const config = withProcessEnvironment(completeApplicationEnvironment, () =>
      getAppConfig(),
    );

    expect(config.businessCentral).toEqual(expectedBusinessCentralConfig);
    expect(Object.isFrozen(config.businessCentral)).toBe(true);
  });

  it('keeps Azure, Dataverse, and Payment Notifications separate', () => {
    const config = withProcessEnvironment(
      completeApplicationEnvironment,
      loadAppConfig,
    );

    expect(config.azure.tenantId).toBe('test-primary-tenant');
    expect(config.businessCentral.tenantId).toBe('test-bc-tenant');
    expect(config.dataverse.environmentUrl).toBe(
      completeApplicationEnvironment['DATAVERSE_ENVIRONMENT_URL'],
    );
    expect(
      config.paymentNotifications?.approvals.validate.approvalGroupIds,
    ).toEqual([
      completeApplicationEnvironment[
        'PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS'
      ],
    ]);
  });

  it('exports the loader and readonly contract publicly', () => {
    const config: PublicBusinessCentralConfig = publicLoadBusinessCentralConfig(
      validBusinessCentralEnvironment,
    );

    expect(config).toEqual(expectedBusinessCentralConfig);
  });
});
