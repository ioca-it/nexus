import {
  evaluatePermission,
  type AuthenticatedActor,
  type PermissionDecision,
} from '@nexus/platform';

export const FINANCE_PERMISSION_MODULE = 'finance';

export const FINANCE_PERMISSION_ACTIONS = Object.freeze({
  READ_INVOICES: 'read_invoices',
  READ_CREDIT_MEMOS: 'read_credit_memos',
} as const);

export type FinancePermissionAction =
  (typeof FINANCE_PERMISSION_ACTIONS)[keyof typeof FINANCE_PERMISSION_ACTIONS];

export interface FinanceAccessRequest {
  readonly actor: AuthenticatedActor;
  readonly action: FinancePermissionAction;
}

export type FinanceAccessDecision = Readonly<PermissionDecision>;

export function evaluateFinanceAccess(
  request: FinanceAccessRequest,
): FinanceAccessDecision {
  const decision = evaluatePermission({
    permissions: request.actor.permissions,
    module: FINANCE_PERMISSION_MODULE,
    action: request.action,
  });

  return Object.freeze({
    allowed: decision.allowed,
    reason: decision.reason,
  });
}
