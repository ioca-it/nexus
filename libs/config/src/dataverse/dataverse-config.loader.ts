import { readEnvironmentVariable } from '../server/environment-reader';
import type { EnvironmentVariables } from '../shared/environment-variables';
import type {
  AuthenticatedActorDataverseSchemaConfig,
  DataverseConfig,
  FinanceCustomerReferenceDataverseSchemaConfig,
  PaymentNotificationDataverseSchemaConfig,
} from './dataverse-config.types';
import { validateDataverseEnvironment } from './dataverse-config.validator';

const DEFAULT_DATAVERSE_API_VERSION = 'v9.2';

export const loadDataverseConfig = (
  environment: EnvironmentVariables = process.env,
): DataverseConfig => {
  const values = validateDataverseEnvironment(environment);

  const paymentNotificationSchema: PaymentNotificationDataverseSchemaConfig =
    Object.freeze({
      notificationEntitySet: values.DATAVERSE_PAYMENT_NOTIFICATION_ENTITY_SET,
      invoiceEntitySet:
        values.DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_ENTITY_SET,
      notificationFields: Object.freeze({
        id: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_ID,
        customerId: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CUSTOMER_ID,
        status: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_STATUS,
        paymentDate: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_PAYMENT_DATE,
        amount: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_AMOUNT,
        currency: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CURRENCY,
        bankReference:
          values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_BANK_REFERENCE,
        receiptFileId:
          values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_RECEIPT_FILE_ID,
        createdAt: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CREATED_AT,
        updatedAt: values.DATAVERSE_PAYMENT_NOTIFICATION_FIELD_UPDATED_AT,
      }),
      invoiceFields: Object.freeze({
        id: values.DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_ID,
        paymentNotificationId:
          values.DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_PAYMENT_NOTIFICATION_ID,
        invoiceId:
          values.DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_INVOICE_ID,
        createdAt:
          values.DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_CREATED_AT,
      }),
    });

  const authenticatedActorSchema: AuthenticatedActorDataverseSchemaConfig =
    Object.freeze({
      user: Object.freeze({
        entitySet: values.DATAVERSE_NEXUS_USER_ENTITY_SET,
        fields: Object.freeze({
          oid: values.DATAVERSE_NEXUS_USER_FIELD_OID,
          active: values.DATAVERSE_NEXUS_USER_FIELD_ACTIVE,
          customerId: values.DATAVERSE_NEXUS_USER_FIELD_CUSTOMER_ID,
        }),
      }),
      role: Object.freeze({
        entitySet: values.DATAVERSE_NEXUS_USER_ROLE_ENTITY_SET,
        fields: Object.freeze({
          oid: values.DATAVERSE_NEXUS_USER_ROLE_FIELD_OID,
          role: values.DATAVERSE_NEXUS_USER_ROLE_FIELD_ROLE,
        }),
      }),
      permission: Object.freeze({
        entitySet: values.DATAVERSE_NEXUS_USER_PERMISSION_ENTITY_SET,
        fields: Object.freeze({
          oid: values.DATAVERSE_NEXUS_USER_PERMISSION_FIELD_OID,
          module: values.DATAVERSE_NEXUS_USER_PERMISSION_FIELD_MODULE,
          action: values.DATAVERSE_NEXUS_USER_PERMISSION_FIELD_ACTION,
          effect: values.DATAVERSE_NEXUS_USER_PERMISSION_FIELD_EFFECT,
        }),
      }),
      approvalGroupMember: Object.freeze({
        entitySet: values.DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_ENTITY_SET,
        fields: Object.freeze({
          oid: values.DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_FIELD_OID,
          approvalGroupId:
            values.DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_FIELD_APPROVAL_GROUP_ID,
        }),
      }),
    });

  const financeCustomerReferenceSchema: FinanceCustomerReferenceDataverseSchemaConfig =
    Object.freeze({
      customerEntitySet: values.DATAVERSE_FINANCE_CUSTOMER_ENTITY_SET,
      customerFields: Object.freeze({
        nexusCustomerId:
          values.DATAVERSE_FINANCE_CUSTOMER_FIELD_NEXUS_CUSTOMER_ID,
        businessCentralCustomerId:
          values.DATAVERSE_FINANCE_CUSTOMER_FIELD_BUSINESS_CENTRAL_CUSTOMER_ID,
        active: values.DATAVERSE_FINANCE_CUSTOMER_FIELD_ACTIVE,
      }),
    });

  return Object.freeze({
    environmentUrl: values.DATAVERSE_ENVIRONMENT_URL,
    apiVersion:
      readEnvironmentVariable('DATAVERSE_API_VERSION', environment) ??
      DEFAULT_DATAVERSE_API_VERSION,
    paymentNotifications: Object.freeze({
      schema: paymentNotificationSchema,
    }),
    authenticatedActor: Object.freeze({
      schema: authenticatedActorSchema,
    }),
    finance: Object.freeze({
      customerReference: Object.freeze({
        schema: financeCustomerReferenceSchema,
      }),
    }),
  });
};
