import {
  loadDataverseConfig as publicLoadDataverseConfig,
  type FinanceCustomerReferenceDataverseSchemaConfig as PublicSchema,
} from '../index';
import { loadAppConfig } from '../loaders/app-config';
import { ConfigurationError } from '../server/configuration-error';
import type { EnvironmentVariables } from '../shared/environment-variables';
import { loadDataverseConfig } from './dataverse-config.loader';
import type { FinanceCustomerReferenceDataverseSchemaConfig } from './dataverse-config.types';
import {
  REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES,
  REQUIRED_FINANCE_CUSTOMER_REFERENCE_DATAVERSE_ENVIRONMENT_VARIABLES,
} from './dataverse-config.validator';

interface FutureFinanceCustomerReferenceGatewaySchema {
  readonly customerEntitySet: string;
  readonly customerFields: {
    readonly nexusCustomerId: string;
    readonly businessCentralCustomerId: string;
    readonly active: string;
  };
}

const FINANCE_VALUES = Object.freeze({
  DATAVERSE_FINANCE_CUSTOMER_ENTITY_SET: 'test_customer_entity_set',
  DATAVERSE_FINANCE_CUSTOMER_FIELD_NEXUS_CUSTOMER_ID: 'test_nexus_customer_id',
  DATAVERSE_FINANCE_CUSTOMER_FIELD_BUSINESS_CENTRAL_CUSTOMER_ID:
    'test_business_central_customer_id',
  DATAVERSE_FINANCE_CUSTOMER_FIELD_ACTIVE: 'test_customer_active',
});

const dataverseEnvironment: EnvironmentVariables = Object.freeze({
  ...Object.fromEntries(
    REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES.map((variableName) => [
      variableName,
      `test_${variableName.toLowerCase()}`,
    ]),
  ),
  DATAVERSE_ENVIRONMENT_URL: 'https://dataverse.example.test',
  ...FINANCE_VALUES,
});

const completeApplicationEnvironment: EnvironmentVariables = Object.freeze({
  ...dataverseEnvironment,
  NODE_ENV: 'test',
  APP_ENV: 'test',
  API_URL: 'https://api.example.test',
  FRONTEND_URL: 'https://portal.example.test',
  AZURE_TENANT_ID: 'test-tenant',
  AZURE_CLIENT_ID: 'test-client',
  AZURE_CLIENT_SECRET: 'test-secret',
  AZURE_KEY_VAULT_URL: 'https://vault.example.test',
  AZURE_STORAGE_ACCOUNT_NAME: 'teststorage',
  PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS: 'GROUP-A',
  PAYMENT_NOTIFICATIONS_REJECT_APPROVAL_GROUP_IDS: 'GROUP-B',
  PAYMENT_NOTIFICATIONS_REQUEST_CHANGES_APPROVAL_GROUP_IDS: 'GROUP-C',
  BUSINESS_CENTRAL_TENANT_ID: 'test-bc-tenant',
  BUSINESS_CENTRAL_CLIENT_ID: 'test-bc-client',
  BUSINESS_CENTRAL_CLIENT_SECRET: 'test-bc-secret',
  BUSINESS_CENTRAL_RESOURCE_URL: 'https://resource.example.test',
  BUSINESS_CENTRAL_ENVIRONMENT_NAME: 'test-environment',
  BUSINESS_CENTRAL_COMPANY_ID: 'test-company',
  BUSINESS_CENTRAL_API_VERSION: 'v2.0',
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

describe('Dataverse Finance customer reference configuration', () => {
  it('loads the entity set and all three fields', () => {
    const schema =
      loadDataverseConfig(dataverseEnvironment).finance.customerReference
        .schema;

    expect(schema).toEqual({
      customerEntitySet: FINANCE_VALUES.DATAVERSE_FINANCE_CUSTOMER_ENTITY_SET,
      customerFields: {
        nexusCustomerId:
          FINANCE_VALUES.DATAVERSE_FINANCE_CUSTOMER_FIELD_NEXUS_CUSTOMER_ID,
        businessCentralCustomerId:
          FINANCE_VALUES.DATAVERSE_FINANCE_CUSTOMER_FIELD_BUSINESS_CENTRAL_CUSTOMER_ID,
        active: FINANCE_VALUES.DATAVERSE_FINANCE_CUSTOMER_FIELD_ACTIVE,
      },
    });
  });

  it('trims every Finance customer reference value', () => {
    const environment = Object.freeze({
      ...dataverseEnvironment,
      ...Object.fromEntries(
        Object.entries(FINANCE_VALUES).map(([name, value]) => [
          name,
          `  ${value}  `,
        ]),
      ),
    });

    expect(
      loadDataverseConfig(environment).finance.customerReference.schema,
    ).toEqual(
      loadDataverseConfig(dataverseEnvironment).finance.customerReference
        .schema,
    );
  });

  it.each(REQUIRED_FINANCE_CUSTOMER_REFERENCE_DATAVERSE_ENVIRONMENT_VARIABLES)(
    'reports an absent required variable clearly: %s',
    (variableName) => {
      const environment = { ...dataverseEnvironment };
      delete environment[variableName];

      expect(() => loadDataverseConfig(environment)).toThrow(
        new ConfigurationError([variableName]),
      );
    },
  );

  it.each(
    REQUIRED_FINANCE_CUSTOMER_REFERENCE_DATAVERSE_ENVIRONMENT_VARIABLES.flatMap(
      (variableName) =>
        [
          [variableName, ''],
          [variableName, '   '],
        ] as const,
    ),
  )('rejects an empty required value: %s = %p', (variableName, value) => {
    expect(() =>
      loadDataverseConfig({
        ...dataverseEnvironment,
        [variableName]: value,
      }),
    ).toThrow(new ConfigurationError([variableName]));
  });

  it('returns a deeply frozen schema', () => {
    const finance = loadDataverseConfig(dataverseEnvironment).finance;
    const customerReference = finance.customerReference;
    const schema = customerReference.schema;

    expect(Object.isFrozen(finance)).toBe(true);
    expect(Object.isFrozen(customerReference)).toBe(true);
    expect(Object.isFrozen(schema)).toBe(true);
    expect(Object.isFrozen(schema.customerFields)).toBe(true);
  });

  it('does not modify the received environment', () => {
    const environment = Object.freeze({ ...dataverseEnvironment });
    const original = { ...environment };

    loadDataverseConfig(environment);

    expect(environment).toEqual(original);
  });

  it('exposes the schema through getAppConfig()', () => {
    const config = withProcessEnvironment(
      completeApplicationEnvironment,
      loadAppConfig,
    );

    expect(config.dataverse.finance).toBeDefined();
    expect(config.dataverse.finance?.customerReference.schema).toEqual(
      loadDataverseConfig(dataverseEnvironment).finance.customerReference
        .schema,
    );
  });

  it('is exported publicly and structurally compatible with a future gateway', () => {
    const configuredSchema: PublicSchema =
      publicLoadDataverseConfig(dataverseEnvironment).finance.customerReference
        .schema;
    const gatewaySchema: FutureFinanceCustomerReferenceGatewaySchema =
      configuredSchema;
    const localSchema: FinanceCustomerReferenceDataverseSchemaConfig =
      gatewaySchema;

    expect(localSchema).toBe(configuredSchema);
  });

  it('does not provide an identifier equality fallback', () => {
    const environment = Object.freeze({
      ...dataverseEnvironment,
      DATAVERSE_FINANCE_CUSTOMER_FIELD_NEXUS_CUSTOMER_ID:
        'nexus_identifier_column',
      DATAVERSE_FINANCE_CUSTOMER_FIELD_BUSINESS_CENTRAL_CUSTOMER_ID:
        'business_central_reference_column',
    });
    const fields =
      loadDataverseConfig(environment).finance.customerReference.schema
        .customerFields;

    expect(fields.nexusCustomerId).not.toBe(fields.businessCentralCustomerId);
  });

  it('keeps existing configuration branches intact', () => {
    const before = loadDataverseConfig(dataverseEnvironment);
    const after = loadDataverseConfig({
      ...dataverseEnvironment,
      ...FINANCE_VALUES,
    });

    expect(after.paymentNotifications).toEqual(before.paymentNotifications);
    expect(after.authenticatedActor).toEqual(before.authenticatedActor);

    const appConfig = withProcessEnvironment(
      completeApplicationEnvironment,
      loadAppConfig,
    );

    expect(appConfig.businessCentral).toEqual({
      tenantId: 'test-bc-tenant',
      clientId: 'test-bc-client',
      clientSecret: 'test-bc-secret',
      resourceUrl: 'https://resource.example.test',
      environmentName: 'test-environment',
      companyId: 'test-company',
      apiVersion: 'v2.0',
    });
    expect(appConfig.paymentNotifications).toBeDefined();
  });

  it('contains no secret-bearing properties or physical defaults', () => {
    const schema =
      loadDataverseConfig(dataverseEnvironment).finance.customerReference
        .schema;

    expect(Object.keys(schema)).toEqual([
      'customerEntitySet',
      'customerFields',
    ]);
    expect(JSON.stringify(schema)).not.toMatch(
      /secret|token|tenant|companyId/i,
    );
  });
});
