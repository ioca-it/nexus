import { REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES } from '../dataverse/dataverse-config.validator';
import { loadAppConfig } from '../loaders/app-config';
import { ConfigurationError } from '../server/configuration-error';
import { getAppConfig } from '../services/config.service';
import type { EnvironmentVariables } from '../shared/environment-variables';
import {
  loadPaymentNotificationsConfig as publicLoadPaymentNotificationsConfig,
  type PaymentNotificationApprovalConfig,
} from '../index';
import { loadPaymentNotificationsConfig } from './payment-notifications-config.loader';
import {
  REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES,
  validatePaymentNotificationApprovalEnvironment,
} from './payment-notifications-config.validator';

const validApprovalEnvironment: EnvironmentVariables = Object.freeze({
  PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS:
    ' GROUP-A, GROUP-B, GROUP-A, , ',
  PAYMENT_NOTIFICATIONS_REJECT_APPROVAL_GROUP_IDS: 'GROUP-C',
  PAYMENT_NOTIFICATIONS_REQUEST_CHANGES_APPROVAL_GROUP_IDS:
    ' GROUP-D, GROUP-E ',
});

const completeApplicationEnvironment: EnvironmentVariables = Object.freeze({
  ...Object.fromEntries(
    REQUIRED_DATAVERSE_ENVIRONMENT_VARIABLES.map((variableName) => [
      variableName,
      `test_${variableName.toLowerCase()}`,
    ]),
  ),
  ...validApprovalEnvironment,
  NODE_ENV: 'test',
  APP_ENV: 'development',
  API_URL: 'https://api.example.test',
  FRONTEND_URL: 'https://portal.example.test',
  AZURE_TENANT_ID: 'test-tenant-id',
  AZURE_CLIENT_ID: 'test-client-id',
  AZURE_CLIENT_SECRET: 'test-client-secret',
  AZURE_KEY_VAULT_URL: 'https://vault.example.test',
  AZURE_STORAGE_ACCOUNT_NAME: 'teststorage',
  BC_TENANT_ID: 'test-bc-tenant',
  BC_ENVIRONMENT: 'test-bc-environment',
  BC_COMPANY_ID: 'test-bc-company',
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

describe('Payment Notifications approval configuration', () => {
  it('loads, trims and deduplicates every action independently', () => {
    const approvals = loadPaymentNotificationsConfig(
      validApprovalEnvironment,
    ).approvals;

    expect(approvals).toEqual({
      validate: {
        approvalGroupIds: ['GROUP-A', 'GROUP-B'],
      },
      reject: {
        approvalGroupIds: ['GROUP-C'],
      },
      requestChanges: {
        approvalGroupIds: ['GROUP-D', 'GROUP-E'],
      },
    });
  });

  it('supports several groups while preserving their original order', () => {
    const config = loadPaymentNotificationsConfig({
      ...validApprovalEnvironment,
      PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS:
        'GROUP-B,GROUP-A,GROUP-B,GROUP-C',
    });

    expect(config.approvals.validate.approvalGroupIds).toEqual([
      'GROUP-B',
      'GROUP-A',
      'GROUP-C',
    ]);
  });

  it('does not mix groups between actions', () => {
    const approvals = loadPaymentNotificationsConfig(
      validApprovalEnvironment,
    ).approvals;

    expect(approvals.validate.approvalGroupIds).not.toContain('GROUP-C');
    expect(approvals.reject.approvalGroupIds).not.toContain('GROUP-A');
    expect(approvals.requestChanges.approvalGroupIds).not.toContain('GROUP-C');
  });

  it.each(REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES)(
    'reports an absent required variable clearly: %s',
    (variableName) => {
      const environment = { ...validApprovalEnvironment };
      delete environment[variableName];

      expect(() =>
        validatePaymentNotificationApprovalEnvironment(environment),
      ).toThrow(new ConfigurationError([variableName]));
    },
  );

  it.each(
    REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES.flatMap(
      (variableName) =>
        [
          [variableName, ''],
          [variableName, '   '],
          [variableName, ' , ,  , '],
        ] as const,
    ),
  )('rejects an action without a valid group: %s = %p', (name, value) => {
    expect(() =>
      loadPaymentNotificationsConfig({
        ...validApprovalEnvironment,
        [name]: value,
      }),
    ).toThrow(new ConfigurationError([name]));
  });

  it('returns a deeply frozen configuration tree and collections', () => {
    const config = loadPaymentNotificationsConfig(validApprovalEnvironment);

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.approvals)).toBe(true);
    expect(Object.isFrozen(config.approvals.validate)).toBe(true);
    expect(Object.isFrozen(config.approvals.reject)).toBe(true);
    expect(Object.isFrozen(config.approvals.requestChanges)).toBe(true);
    expect(Object.isFrozen(config.approvals.validate.approvalGroupIds)).toBe(
      true,
    );
    expect(Object.isFrozen(config.approvals.reject.approvalGroupIds)).toBe(
      true,
    );
    expect(
      Object.isFrozen(config.approvals.requestChanges.approvalGroupIds),
    ).toBe(true);
  });

  it('does not modify the provided environment', () => {
    const environment = Object.freeze({ ...validApprovalEnvironment });
    const originalEnvironment = { ...environment };

    loadPaymentNotificationsConfig(environment);

    expect(environment).toEqual(originalEnvironment);
  });

  it('exposes the complete structure through getAppConfig()', () => {
    const config = withProcessEnvironment(completeApplicationEnvironment, () =>
      getAppConfig(),
    );
    const paymentNotifications = config.paymentNotifications;

    expect(paymentNotifications).toBeDefined();

    expect(paymentNotifications?.approvals).toEqual({
      validate: {
        approvalGroupIds: ['GROUP-A', 'GROUP-B'],
      },
      reject: {
        approvalGroupIds: ['GROUP-C'],
      },
      requestChanges: {
        approvalGroupIds: ['GROUP-D', 'GROUP-E'],
      },
    });
  });

  it('keeps Dataverse and Business Central configuration intact', () => {
    const config = withProcessEnvironment(
      completeApplicationEnvironment,
      loadAppConfig,
    );

    expect(config.dataverse.environmentUrl).toBe(
      completeApplicationEnvironment['DATAVERSE_ENVIRONMENT_URL'],
    );
    expect(config.businessCentral).toEqual({
      tenantId: 'test-bc-tenant',
      environment: 'test-bc-environment',
      companyId: 'test-bc-company',
    });
  });

  it('exports the loader and public readonly contracts', () => {
    const config = publicLoadPaymentNotificationsConfig(
      validApprovalEnvironment,
    );
    const approvals: PaymentNotificationApprovalConfig = config.approvals;

    expect(approvals).toBe(config.approvals);
  });
});
