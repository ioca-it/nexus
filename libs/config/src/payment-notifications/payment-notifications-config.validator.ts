import { ConfigurationError } from '../server/configuration-error';
import { readEnvironmentVariable } from '../server/environment-reader';
import type { EnvironmentVariables } from '../shared/environment-variables';

export const REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES = [
  'PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS',
  'PAYMENT_NOTIFICATIONS_REJECT_APPROVAL_GROUP_IDS',
  'PAYMENT_NOTIFICATIONS_REQUEST_CHANGES_APPROVAL_GROUP_IDS',
] as const;

type PaymentNotificationApprovalEnvironmentVariable =
  (typeof REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES)[number];

export type ValidatedPaymentNotificationApprovalEnvironment = Readonly<
  Record<PaymentNotificationApprovalEnvironmentVariable, readonly string[]>
>;

function normalizeApprovalGroupIds(value: string): readonly string[] {
  const approvalGroupIds: string[] = [];
  const uniqueApprovalGroupIds = new Set<string>();

  for (const candidate of value.split(',')) {
    const approvalGroupId = candidate.trim();

    if (
      approvalGroupId.length > 0 &&
      !uniqueApprovalGroupIds.has(approvalGroupId)
    ) {
      uniqueApprovalGroupIds.add(approvalGroupId);
      approvalGroupIds.push(approvalGroupId);
    }
  }

  return Object.freeze(approvalGroupIds);
}

export function validatePaymentNotificationApprovalEnvironment(
  environment: EnvironmentVariables = process.env,
): ValidatedPaymentNotificationApprovalEnvironment {
  const missingVariables: PaymentNotificationApprovalEnvironmentVariable[] = [];
  const entries: [
    PaymentNotificationApprovalEnvironmentVariable,
    readonly string[],
  ][] = [];

  for (const variableName of REQUIRED_PAYMENT_NOTIFICATION_APPROVAL_ENVIRONMENT_VARIABLES) {
    const value = readEnvironmentVariable(variableName, environment);

    if (!value) {
      missingVariables.push(variableName);
      continue;
    }

    const approvalGroupIds = normalizeApprovalGroupIds(value);

    if (approvalGroupIds.length === 0) {
      missingVariables.push(variableName);
      continue;
    }

    entries.push([variableName, approvalGroupIds]);
  }

  if (missingVariables.length > 0) {
    throw new ConfigurationError(missingVariables);
  }

  return Object.freeze(
    Object.fromEntries(
      entries,
    ) as ValidatedPaymentNotificationApprovalEnvironment,
  );
}
