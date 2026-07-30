import {
  loadDataverseConfig as publicLoadDataverseConfig,
  type CommercialCatalogDataverseSchemaConfig as PublicSchema,
} from '../index';
import { loadAppConfig } from '../loaders/app-config';
import { getAppConfig } from '../services/config.service';
import { ConfigurationError } from '../server/configuration-error';
import type { EnvironmentVariables } from '../shared/environment-variables';
import { loadDataverseConfig } from './dataverse-config.loader';
import type { CommercialCatalogDataverseSchemaConfig } from './dataverse-config.types';
import {
  REQUIRED_COMMERCIAL_CATALOG_DATAVERSE_ENVIRONMENT_VARIABLES,
  REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES,
} from './dataverse-config.validator';

interface FutureCommercialCatalogGatewaySchema {
  readonly product: {
    readonly entitySet: string;
    readonly fields: {
      readonly id: string;
      readonly number: string;
      readonly name: string;
      readonly description: string;
      readonly categoryId: string;
      readonly imageReference: string;
      readonly unitOfMeasureCode: string;
      readonly active: string;
    };
  };
  readonly customerPrice: {
    readonly entitySet: string;
    readonly fields: {
      readonly id: string;
      readonly customerId: string;
      readonly productId: string;
      readonly currencyCode: string;
      readonly unitPrice: string;
      readonly minimumQuantity: string;
      readonly validFrom: string;
      readonly validTo: string;
      readonly active: string;
    };
  };
}

const PRODUCT_VALUES = Object.freeze({
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_ENTITY_SET: 'test_products',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ID: 'test_product_id',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_NUMBER: 'test_product_number',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_NAME: 'test_product_name',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_DESCRIPTION:
    'test_product_description',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_CATEGORY_ID:
    'test_product_category_id',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_IMAGE_REFERENCE:
    'test_product_image_reference',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_UNIT_OF_MEASURE_CODE:
    'test_product_unit_of_measure_code',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ACTIVE: 'test_product_active',
});

const PRICE_VALUES = Object.freeze({
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_ENTITY_SET: 'test_customer_prices',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_ID: 'test_price_id',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_CUSTOMER_ID:
    'test_price_customer_id',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_PRODUCT_ID: 'test_price_product_id',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_CURRENCY_CODE:
    'test_price_currency_code',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_UNIT_PRICE: 'test_price_unit_price',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_MINIMUM_QUANTITY:
    'test_price_minimum_quantity',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_VALID_FROM: 'test_price_valid_from',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_VALID_TO: 'test_price_valid_to',
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_ACTIVE: 'test_price_active',
});

const dataverseEnvironment: EnvironmentVariables = Object.freeze({
  ...Object.fromEntries(
    REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES.map((variableName) => [
      variableName,
      `test_${variableName.toLowerCase()}`,
    ]),
  ),
  DATAVERSE_ENVIRONMENT_URL: 'https://dataverse.example.test',
  ...PRODUCT_VALUES,
  ...PRICE_VALUES,
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

const productVariables =
  REQUIRED_COMMERCIAL_CATALOG_DATAVERSE_ENVIRONMENT_VARIABLES.filter(
    (variableName) => variableName.includes('_PRODUCT_'),
  );
const priceVariables =
  REQUIRED_COMMERCIAL_CATALOG_DATAVERSE_ENVIRONMENT_VARIABLES.filter(
    (variableName) => variableName.includes('_PRICE_'),
  );

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

describe('Dataverse Commercial Catalog configuration', () => {
  it('loads the product entity set and every product field', () => {
    const product =
      loadDataverseConfig(dataverseEnvironment).commercialCatalog.schema
        .product;

    expect(product).toEqual({
      entitySet: PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_ENTITY_SET,
      fields: {
        id: PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ID,
        number:
          PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_NUMBER,
        name: PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_NAME,
        description:
          PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_DESCRIPTION,
        categoryId:
          PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_CATEGORY_ID,
        imageReference:
          PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_IMAGE_REFERENCE,
        unitOfMeasureCode:
          PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_UNIT_OF_MEASURE_CODE,
        active:
          PRODUCT_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ACTIVE,
      },
    });
  });

  it('loads the customer price entity set and every price field', () => {
    const customerPrice =
      loadDataverseConfig(dataverseEnvironment).commercialCatalog.schema
        .customerPrice;

    expect(customerPrice).toEqual({
      entitySet: PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_ENTITY_SET,
      fields: {
        id: PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_ID,
        customerId:
          PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_CUSTOMER_ID,
        productId:
          PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_PRODUCT_ID,
        currencyCode:
          PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_CURRENCY_CODE,
        unitPrice:
          PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_UNIT_PRICE,
        minimumQuantity:
          PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_MINIMUM_QUANTITY,
        validFrom:
          PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_VALID_FROM,
        validTo: PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_VALID_TO,
        active: PRICE_VALUES.DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_ACTIVE,
      },
    });
  });

  it('trims all configured physical names', () => {
    const paddedEnvironment = Object.freeze({
      ...dataverseEnvironment,
      ...Object.fromEntries(
        REQUIRED_COMMERCIAL_CATALOG_DATAVERSE_ENVIRONMENT_VARIABLES.map(
          (variableName) => [
            variableName,
            `  ${dataverseEnvironment[variableName]}  `,
          ],
        ),
      ),
    });

    expect(
      loadDataverseConfig(paddedEnvironment).commercialCatalog.schema,
    ).toEqual(
      loadDataverseConfig(dataverseEnvironment).commercialCatalog.schema,
    );
  });

  it.each([...productVariables, ...priceVariables])(
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
    REQUIRED_COMMERCIAL_CATALOG_DATAVERSE_ENVIRONMENT_VARIABLES.flatMap(
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

  it('deeply freezes the complete Commercial Catalog schema tree', () => {
    const commercialCatalog =
      loadDataverseConfig(dataverseEnvironment).commercialCatalog;
    const schema = commercialCatalog.schema;

    expect(Object.isFrozen(commercialCatalog)).toBe(true);
    expect(Object.isFrozen(schema)).toBe(true);
    expect(Object.isFrozen(schema.product)).toBe(true);
    expect(Object.isFrozen(schema.product.fields)).toBe(true);
    expect(Object.isFrozen(schema.customerPrice)).toBe(true);
    expect(Object.isFrozen(schema.customerPrice.fields)).toBe(true);
  });

  it('does not modify the received environment', () => {
    const environment = Object.freeze({ ...dataverseEnvironment });
    const original = { ...environment };

    loadDataverseConfig(environment);

    expect(environment).toEqual(original);
  });

  it('exposes config.dataverse.commercialCatalog.schema through getAppConfig()', () => {
    const config = withProcessEnvironment(
      completeApplicationEnvironment,
      getAppConfig,
    );

    expect(config.dataverse.commercialCatalog).toBeDefined();
    expect(config.dataverse.commercialCatalog?.schema).toEqual(
      loadDataverseConfig(dataverseEnvironment).commercialCatalog.schema,
    );
  });

  it('is publicly exported and structurally compatible with future gateways', () => {
    const configuredSchema: PublicSchema =
      publicLoadDataverseConfig(dataverseEnvironment).commercialCatalog.schema;
    const gatewaySchema: FutureCommercialCatalogGatewaySchema =
      configuredSchema;
    const localSchema: CommercialCatalogDataverseSchemaConfig = gatewaySchema;

    expect(localSchema).toBe(configuredSchema);
  });

  it('keeps all existing configuration branches intact', () => {
    const before = loadDataverseConfig(dataverseEnvironment);
    const after = loadDataverseConfig({
      ...dataverseEnvironment,
      ...Object.fromEntries(
        REQUIRED_COMMERCIAL_CATALOG_DATAVERSE_ENVIRONMENT_VARIABLES.map(
          (variableName) => [
            variableName,
            `alternate_${variableName.toLowerCase()}`,
          ],
        ),
      ),
    });

    expect(after.paymentNotifications).toEqual(before.paymentNotifications);
    expect(after.authenticatedActor).toEqual(before.authenticatedActor);
    expect(after.finance).toEqual(before.finance);

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

  it('contains only physical names and no inventory or secret-bearing properties', () => {
    const schema =
      loadDataverseConfig(dataverseEnvironment).commercialCatalog.schema;
    const serialized = JSON.stringify(schema);

    expect(Object.keys(schema)).toEqual(['product', 'customerPrice']);
    expect(serialized).not.toMatch(
      /inventory|availableQuantity|secret|token|tenant|companyId/i,
    );
  });
});
