import { ConfigurationError } from '../server/configuration-error';
import { readEnvironmentVariable } from '../server/environment-reader';
import type { EnvironmentVariables } from '../shared/environment-variables';
export const REQUIRED_ORDERS_APPROVAL_ENVIRONMENT_VARIABLES = [
  'ORDERS_REQUEST_CHANGES_APPROVAL_GROUP_IDS',
  'ORDERS_REJECT_APPROVAL_GROUP_IDS',
  'ORDERS_APPROVE_APPROVAL_GROUP_IDS',
] as const;
type OrdersApprovalEnvironmentVariable =
  (typeof REQUIRED_ORDERS_APPROVAL_ENVIRONMENT_VARIABLES)[number];
export type ValidatedOrdersApprovalEnvironment = Readonly<
  Record<OrdersApprovalEnvironmentVariable, readonly string[]>
>;
function normalize(value: string): readonly string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value.split(',')) {
    const normalized = candidate.trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return Object.freeze(result);
}
export function validateOrdersApprovalEnvironment(
  environment: EnvironmentVariables = process.env,
): ValidatedOrdersApprovalEnvironment {
  const missing: OrdersApprovalEnvironmentVariable[] = [];
  const entries: [OrdersApprovalEnvironmentVariable, readonly string[]][] = [];
  for (const name of REQUIRED_ORDERS_APPROVAL_ENVIRONMENT_VARIABLES) {
    const value = readEnvironmentVariable(name, environment);
    const groups = value ? normalize(value) : [];
    if (groups.length === 0) missing.push(name);
    else entries.push([name, groups]);
  }
  if (missing.length) throw new ConfigurationError(missing);
  return Object.freeze(
    Object.fromEntries(entries) as ValidatedOrdersApprovalEnvironment,
  );
}
