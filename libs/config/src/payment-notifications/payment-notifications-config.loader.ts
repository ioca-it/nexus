import type { EnvironmentVariables } from '../shared/environment-variables';
import type { PaymentNotificationsConfig } from './payment-notifications-config.types';
import { validatePaymentNotificationApprovalEnvironment } from './payment-notifications-config.validator';

export function loadPaymentNotificationsConfig(
  environment: EnvironmentVariables = process.env,
): PaymentNotificationsConfig {
  const values = validatePaymentNotificationApprovalEnvironment(environment);

  return Object.freeze({
    approvals: Object.freeze({
      validate: Object.freeze({
        approvalGroupIds:
          values.PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS,
      }),
      reject: Object.freeze({
        approvalGroupIds:
          values.PAYMENT_NOTIFICATIONS_REJECT_APPROVAL_GROUP_IDS,
      }),
      requestChanges: Object.freeze({
        approvalGroupIds:
          values.PAYMENT_NOTIFICATIONS_REQUEST_CHANGES_APPROVAL_GROUP_IDS,
      }),
    }),
  });
}
