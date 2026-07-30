import type { DataverseAuthenticatedActorSchema } from '@nexus/platform';

import { ConfigurationError } from '../server/configuration-error';
import type { EnvironmentVariables } from '../shared/environment-variables';
import { loadAppConfig } from '../loaders/app-config';
import { getAppConfig } from '../services/config.service';
import { loadDataverseConfig } from './dataverse-config.loader';
import type {
  AuthenticatedActorDataverseSchemaConfig,
  PaymentNotificationDataverseSchemaConfig,
} from './dataverse-config.types';
import {
  REQUIRED_AUTHENTICATED_ACTOR_DATAVERSE_ENVIRONMENT_VARIABLES,
  REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES,
  validateDataverseEnvironment,
} from './dataverse-config.validator';

const authenticatedActorSchema: AuthenticatedActorDataverseSchemaConfig =
  Object.freeze({
    user: Object.freeze({
      entitySet: 'test_nexus_users',
      fields: Object.freeze({
        oid: 'test_user_oid',
        active: 'test_user_active',
        customerId: 'test_user_customer_id',
      }),
    }),
    role: Object.freeze({
      entitySet: 'test_nexus_user_roles',
      fields: Object.freeze({
        oid: 'test_role_oid',
        role: 'test_role',
      }),
    }),
    permission: Object.freeze({
      entitySet: 'test_nexus_user_permissions',
      fields: Object.freeze({
        oid: 'test_permission_oid',
        module: 'test_permission_module',
        action: 'test_permission_action',
        effect: 'test_permission_effect',
      }),
    }),
    approvalGroupMember: Object.freeze({
      entitySet: 'test_nexus_approval_group_members',
      fields: Object.freeze({
        oid: 'test_group_member_oid',
        approvalGroupId: 'test_approval_group_id',
      }),
    }),
  });

const validDataverseEnvironment: EnvironmentVariables = Object.freeze({
  DATAVERSE_ENVIRONMENT_URL: 'https://example.crm.dynamics.com',
  DATAVERSE_API_VERSION: 'v9.2',
  DATAVERSE_PAYMENT_NOTIFICATION_ENTITY_SET: 'test_payment_notifications',
  DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_ENTITY_SET:
    'test_payment_notification_invoices',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_ID: 'test_notification_id',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CUSTOMER_ID: 'test_customer_id',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_STATUS: 'test_status',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_PAYMENT_DATE: 'test_payment_date',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_AMOUNT: 'test_amount',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CURRENCY: 'test_currency',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_BANK_REFERENCE: 'test_bank_reference',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_RECEIPT_FILE_ID: 'test_receipt_file_id',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CREATED_AT: 'test_created_at',
  DATAVERSE_PAYMENT_NOTIFICATION_FIELD_UPDATED_AT: 'test_updated_at',
  DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_ID: 'test_relation_id',
  DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_PAYMENT_NOTIFICATION_ID:
    'test_relation_payment_notification_id',
  DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_INVOICE_ID:
    'test_relation_invoice_id',
  DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_CREATED_AT:
    'test_relation_created_at',
  DATAVERSE_NEXUS_USER_ENTITY_SET: authenticatedActorSchema.user.entitySet,
  DATAVERSE_NEXUS_USER_ROLE_ENTITY_SET: authenticatedActorSchema.role.entitySet,
  DATAVERSE_NEXUS_USER_PERMISSION_ENTITY_SET:
    authenticatedActorSchema.permission.entitySet,
  DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_ENTITY_SET:
    authenticatedActorSchema.approvalGroupMember.entitySet,
  DATAVERSE_NEXUS_USER_FIELD_OID: authenticatedActorSchema.user.fields.oid,
  DATAVERSE_NEXUS_USER_FIELD_ACTIVE:
    authenticatedActorSchema.user.fields.active,
  DATAVERSE_NEXUS_USER_FIELD_CUSTOMER_ID:
    authenticatedActorSchema.user.fields.customerId,
  DATAVERSE_NEXUS_USER_ROLE_FIELD_OID: authenticatedActorSchema.role.fields.oid,
  DATAVERSE_NEXUS_USER_ROLE_FIELD_ROLE:
    authenticatedActorSchema.role.fields.role,
  DATAVERSE_NEXUS_USER_PERMISSION_FIELD_OID:
    authenticatedActorSchema.permission.fields.oid,
  DATAVERSE_NEXUS_USER_PERMISSION_FIELD_MODULE:
    authenticatedActorSchema.permission.fields.module,
  DATAVERSE_NEXUS_USER_PERMISSION_FIELD_ACTION:
    authenticatedActorSchema.permission.fields.action,
  DATAVERSE_NEXUS_USER_PERMISSION_FIELD_EFFECT:
    authenticatedActorSchema.permission.fields.effect,
  DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_FIELD_OID:
    authenticatedActorSchema.approvalGroupMember.fields.oid,
  DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_FIELD_APPROVAL_GROUP_ID:
    authenticatedActorSchema.approvalGroupMember.fields.approvalGroupId,
  DATAVERSE_FINANCE_CUSTOMER_ENTITY_SET: 'test_finance_customers',
  DATAVERSE_FINANCE_CUSTOMER_FIELD_NEXUS_CUSTOMER_ID:
    'test_finance_nexus_customer_id',
  DATAVERSE_FINANCE_CUSTOMER_FIELD_BUSINESS_CENTRAL_CUSTOMER_ID:
    'test_finance_business_central_customer_id',
  DATAVERSE_FINANCE_CUSTOMER_FIELD_ACTIVE: 'test_finance_customer_active',
  DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_ENTITY_SET: 'test_catalog_products',
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
  DATAVERSE_COMMERCIAL_CATALOG_PRICE_ENTITY_SET: 'test_catalog_customer_prices',
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

const completeApplicationEnvironment: EnvironmentVariables = Object.freeze({
  ...validDataverseEnvironment,
  NODE_ENV: 'test',
  APP_ENV: 'development',
  API_URL: 'https://api.example.test',
  FRONTEND_URL: 'https://portal.example.test',
  AZURE_TENANT_ID: 'test-tenant-id',
  AZURE_CLIENT_ID: 'test-client-id',
  AZURE_CLIENT_SECRET: 'test-client-secret',
  AZURE_KEY_VAULT_URL: 'https://vault.example.test',
  AZURE_STORAGE_ACCOUNT_NAME: 'teststorage',
  PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS: 'GROUP-A',
  PAYMENT_NOTIFICATIONS_REJECT_APPROVAL_GROUP_IDS: 'GROUP-B',
  PAYMENT_NOTIFICATIONS_REQUEST_CHANGES_APPROVAL_GROUP_IDS: 'GROUP-C',
  BUSINESS_CENTRAL_TENANT_ID: 'test-bc-tenant',
  BUSINESS_CENTRAL_CLIENT_ID: 'test-bc-client',
  BUSINESS_CENTRAL_CLIENT_SECRET: 'test-bc-secret',
  BUSINESS_CENTRAL_RESOURCE_URL: 'https://resource.example.test',
  BUSINESS_CENTRAL_ENVIRONMENT_NAME: 'test-bc-environment',
  BUSINESS_CENTRAL_COMPANY_ID: 'test-bc-company',
  BUSINESS_CENTRAL_API_VERSION: 'test-bc-version',
});

const requiredFieldVariables = REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES.filter(
  (variableName) => variableName.includes('_FIELD_'),
);
const authenticatedActorEntitySetVariables =
  REQUIRED_AUTHENTICATED_ACTOR_DATAVERSE_ENVIRONMENT_VARIABLES.filter(
    (variableName) => variableName.endsWith('_ENTITY_SET'),
  );
const authenticatedActorFieldVariables =
  REQUIRED_AUTHENTICATED_ACTOR_DATAVERSE_ENVIRONMENT_VARIABLES.filter(
    (variableName) => variableName.includes('_FIELD_'),
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

describe('Dataverse configuration', () => {
  it('loads both Payment Notifications entity sets', () => {
    const schema = loadDataverseConfig(validDataverseEnvironment)
      .paymentNotifications.schema;

    expect(schema.notificationEntitySet).toBe('test_payment_notifications');
    expect(schema.invoiceEntitySet).toBe('test_payment_notification_invoices');
  });

  it('loads every PaymentNotification field', () => {
    const schema = loadDataverseConfig(validDataverseEnvironment)
      .paymentNotifications.schema;

    expect(schema.notificationFields).toEqual({
      id: 'test_notification_id',
      customerId: 'test_customer_id',
      status: 'test_status',
      paymentDate: 'test_payment_date',
      amount: 'test_amount',
      currency: 'test_currency',
      bankReference: 'test_bank_reference',
      receiptFileId: 'test_receipt_file_id',
      createdAt: 'test_created_at',
      updatedAt: 'test_updated_at',
    });
  });

  it('loads every PaymentNotificationInvoice field', () => {
    const schema = loadDataverseConfig(validDataverseEnvironment)
      .paymentNotifications.schema;

    expect(schema.invoiceFields).toEqual({
      id: 'test_relation_id',
      paymentNotificationId: 'test_relation_payment_notification_id',
      invoiceId: 'test_relation_invoice_id',
      createdAt: 'test_relation_created_at',
    });
  });

  it('trims every loaded Dataverse value', () => {
    const paddedEnvironment = Object.freeze(
      Object.fromEntries(
        Object.entries(validDataverseEnvironment).map(
          ([variableName, value]) => [variableName, `  ${value}  `],
        ),
      ),
    );
    const config = loadDataverseConfig(paddedEnvironment);

    expect(config.environmentUrl).toBe(
      validDataverseEnvironment['DATAVERSE_ENVIRONMENT_URL'],
    );
    expect(config.apiVersion).toBe(
      validDataverseEnvironment['DATAVERSE_API_VERSION'],
    );
    expect(config.paymentNotifications.schema.notificationEntitySet).toBe(
      validDataverseEnvironment['DATAVERSE_PAYMENT_NOTIFICATION_ENTITY_SET'],
    );
    expect(config.paymentNotifications.schema.invoiceFields.invoiceId).toBe(
      validDataverseEnvironment[
        'DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_INVOICE_ID'
      ],
    );
  });

  it.each([
    'DATAVERSE_PAYMENT_NOTIFICATION_ENTITY_SET',
    'DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_ENTITY_SET',
  ] as const)('rejects an empty required entity set: %s', (variableName) => {
    expect(() =>
      loadDataverseConfig({
        ...validDataverseEnvironment,
        [variableName]: '   ',
      }),
    ).toThrow(new ConfigurationError([variableName]));
  });

  it.each(requiredFieldVariables)(
    'reports a missing required physical field clearly: %s',
    (variableName) => {
      const environment = { ...validDataverseEnvironment };
      delete environment[variableName];

      expect(() => validateDataverseEnvironment(environment)).toThrow(
        new ConfigurationError([variableName]),
      );
    },
  );

  it('does not expose secrets in Dataverse configuration', () => {
    const serializedConfig = JSON.stringify(
      loadDataverseConfig(validDataverseEnvironment),
    );

    expect(serializedConfig).not.toMatch(/secret|clientSecret|token/i);
  });

  it('does not modify the provided environment', () => {
    const environment = Object.freeze({ ...validDataverseEnvironment });
    const originalEnvironment = { ...environment };

    loadDataverseConfig(environment);

    expect(environment).toEqual(originalEnvironment);
  });

  it('returns an immutable Dataverse configuration tree', () => {
    const config = loadDataverseConfig(validDataverseEnvironment);
    const schema = config.paymentNotifications.schema;

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.paymentNotifications)).toBe(true);
    expect(Object.isFrozen(schema)).toBe(true);
    expect(Object.isFrozen(schema.notificationFields)).toBe(true);
    expect(Object.isFrozen(schema.invoiceFields)).toBe(true);
  });

  it('exposes the complete schema through getAppConfig()', () => {
    const config = withProcessEnvironment(completeApplicationEnvironment, () =>
      getAppConfig(),
    );

    expect(config.dataverse.paymentNotifications.schema).toEqual(
      loadDataverseConfig(validDataverseEnvironment).paymentNotifications
        .schema,
    );
  });

  it('exposes the physical schema without a property-name mapping', () => {
    const configuredSchema = loadDataverseConfig(validDataverseEnvironment)
      .paymentNotifications.schema;
    const compatibleSchema: PaymentNotificationDataverseSchemaConfig =
      configuredSchema;

    expect(compatibleSchema).toBe(configuredSchema);
  });

  it('preserves existing Dataverse environment and API version behavior', () => {
    const config = loadDataverseConfig({
      ...validDataverseEnvironment,
      DATAVERSE_ENVIRONMENT_URL: ' https://other.crm.dynamics.com ',
      DATAVERSE_API_VERSION: ' v9.3 ',
    });

    expect(config.environmentUrl).toBe('https://other.crm.dynamics.com');
    expect(config.apiVersion).toBe('v9.3');
  });

  it('preserves the default Dataverse API version', () => {
    const environment = { ...validDataverseEnvironment };
    delete environment['DATAVERSE_API_VERSION'];

    expect(loadDataverseConfig(environment).apiVersion).toBe('v9.2');
  });

  it('does not change Business Central configuration', () => {
    const config = withProcessEnvironment(
      completeApplicationEnvironment,
      loadAppConfig,
    );

    expect(config.businessCentral).toEqual({
      tenantId: 'test-bc-tenant',
      clientId: 'test-bc-client',
      clientSecret: 'test-bc-secret',
      resourceUrl: 'https://resource.example.test',
      environmentName: 'test-bc-environment',
      companyId: 'test-bc-company',
      apiVersion: 'test-bc-version',
    });
  });
});

describe('Dataverse Authenticated Actor configuration', () => {
  it('loads all four entity sets', () => {
    const schema = loadDataverseConfig(validDataverseEnvironment)
      .authenticatedActor.schema;

    expect({
      user: schema.user.entitySet,
      role: schema.role.entitySet,
      permission: schema.permission.entitySet,
      approvalGroupMember: schema.approvalGroupMember.entitySet,
    }).toEqual({
      user: authenticatedActorSchema.user.entitySet,
      role: authenticatedActorSchema.role.entitySet,
      permission: authenticatedActorSchema.permission.entitySet,
      approvalGroupMember:
        authenticatedActorSchema.approvalGroupMember.entitySet,
    });
  });

  it('loads every user field', () => {
    const fields = loadDataverseConfig(validDataverseEnvironment)
      .authenticatedActor.schema.user.fields;

    expect(fields).toEqual(authenticatedActorSchema.user.fields);
  });

  it('loads every role field', () => {
    const fields = loadDataverseConfig(validDataverseEnvironment)
      .authenticatedActor.schema.role.fields;

    expect(fields).toEqual(authenticatedActorSchema.role.fields);
  });

  it('loads every permission field', () => {
    const fields = loadDataverseConfig(validDataverseEnvironment)
      .authenticatedActor.schema.permission.fields;

    expect(fields).toEqual(authenticatedActorSchema.permission.fields);
  });

  it('loads every approval group member field', () => {
    const fields = loadDataverseConfig(validDataverseEnvironment)
      .authenticatedActor.schema.approvalGroupMember.fields;

    expect(fields).toEqual(authenticatedActorSchema.approvalGroupMember.fields);
  });

  it('trims every Authenticated Actor schema value', () => {
    const paddedEnvironment = Object.freeze(
      Object.fromEntries(
        Object.entries(validDataverseEnvironment).map(
          ([variableName, value]) => [variableName, `  ${value}  `],
        ),
      ),
    );

    expect(
      loadDataverseConfig(paddedEnvironment).authenticatedActor.schema,
    ).toEqual(authenticatedActorSchema);
  });

  it.each(authenticatedActorEntitySetVariables)(
    'reports a missing Authenticated Actor entity set clearly: %s',
    (variableName) => {
      const environment = { ...validDataverseEnvironment };
      delete environment[variableName];

      expect(() => validateDataverseEnvironment(environment)).toThrow(
        new ConfigurationError([variableName]),
      );
    },
  );

  it.each(authenticatedActorFieldVariables)(
    'reports a missing Authenticated Actor field clearly: %s',
    (variableName) => {
      const environment = { ...validDataverseEnvironment };
      delete environment[variableName];

      expect(() => validateDataverseEnvironment(environment)).toThrow(
        new ConfigurationError([variableName]),
      );
    },
  );

  it.each(
    REQUIRED_AUTHENTICATED_ACTOR_DATAVERSE_ENVIRONMENT_VARIABLES.flatMap(
      (variableName) =>
        [
          [variableName, ''],
          [variableName, '   '],
        ] as const,
    ),
  )('rejects an empty Authenticated Actor value: %s = %p', (name, value) => {
    expect(() =>
      loadDataverseConfig({
        ...validDataverseEnvironment,
        [name]: value,
      }),
    ).toThrow(new ConfigurationError([name]));
  });

  it('exposes the schema through getAppConfig()', () => {
    const config = withProcessEnvironment(completeApplicationEnvironment, () =>
      getAppConfig(),
    );

    expect(config.dataverse).toHaveProperty('authenticatedActor.schema');
    expect(config.dataverse.authenticatedActor?.schema).toEqual(
      authenticatedActorSchema,
    );
  });

  it('is directly assignable to the gateway schema contract', () => {
    const configuredSchema = loadDataverseConfig(validDataverseEnvironment)
      .authenticatedActor.schema;
    const gatewaySchema: DataverseAuthenticatedActorSchema = configuredSchema;

    expect(gatewaySchema).toBe(configuredSchema);
  });

  it('returns a deeply frozen Authenticated Actor configuration tree', () => {
    const config = loadDataverseConfig(validDataverseEnvironment);
    const authenticatedActor = config.authenticatedActor;
    const schema = authenticatedActor.schema;

    expect(Object.isFrozen(authenticatedActor)).toBe(true);
    expect(Object.isFrozen(schema)).toBe(true);
    expect(Object.isFrozen(schema.user)).toBe(true);
    expect(Object.isFrozen(schema.user.fields)).toBe(true);
    expect(Object.isFrozen(schema.role)).toBe(true);
    expect(Object.isFrozen(schema.role.fields)).toBe(true);
    expect(Object.isFrozen(schema.permission)).toBe(true);
    expect(Object.isFrozen(schema.permission.fields)).toBe(true);
    expect(Object.isFrozen(schema.approvalGroupMember)).toBe(true);
    expect(Object.isFrozen(schema.approvalGroupMember.fields)).toBe(true);
  });

  it('does not modify Payment Notifications configuration', () => {
    const schema = loadDataverseConfig(validDataverseEnvironment)
      .paymentNotifications.schema;

    expect(schema.notificationEntitySet).toBe('test_payment_notifications');
    expect(schema.invoiceEntitySet).toBe('test_payment_notification_invoices');
    expect(schema.invoiceFields.invoiceId).toBe('test_relation_invoice_id');
  });
});
