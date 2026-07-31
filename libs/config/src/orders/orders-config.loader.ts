import type { EnvironmentVariables } from '../shared/environment-variables';
import type { OrdersConfig } from './orders-config.types';
import { validateOrdersApprovalEnvironment } from './orders-config.validator';
export function loadOrdersConfig(
  environment: EnvironmentVariables = process.env,
): OrdersConfig {
  const values = validateOrdersApprovalEnvironment(environment);
  return Object.freeze({
    approvals: Object.freeze({
      requestChanges: Object.freeze({
        approvalGroupIds: values.ORDERS_REQUEST_CHANGES_APPROVAL_GROUP_IDS,
      }),
      reject: Object.freeze({
        approvalGroupIds: values.ORDERS_REJECT_APPROVAL_GROUP_IDS,
      }),
      approve: Object.freeze({
        approvalGroupIds: values.ORDERS_APPROVE_APPROVAL_GROUP_IDS,
      }),
    }),
  });
}
