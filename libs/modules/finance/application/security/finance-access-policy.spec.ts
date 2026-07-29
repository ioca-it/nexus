import type { AuthenticatedActor, Permission } from '@nexus/platform';
import {
  evaluateFinanceAccess,
  FINANCE_PERMISSION_ACTIONS,
  FINANCE_PERMISSION_MODULE,
} from '../../index';

function createActor(
  permissions: readonly Permission[],
  roles: readonly string[] = [],
): AuthenticatedActor {
  return Object.freeze({
    userId: 'user-id',
    customerId: 'nexus-customer-id',
    roles: Object.freeze([...roles]),
    permissions: Object.freeze([...permissions]),
    approvalGroupIds: Object.freeze([]),
  });
}

describe('evaluateFinanceAccess', () => {
  it('allows an explicit permission and returns a frozen decision', () => {
    const decision = evaluateFinanceAccess({
      actor: createActor([
        {
          module: FINANCE_PERMISSION_MODULE,
          action: FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
          effect: 'allow',
        },
      ]),
      action: FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
    });

    expect(decision.allowed).toBe(true);
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it('denies when no applicable permission exists', () => {
    const decision = evaluateFinanceAccess({
      actor: createActor([]),
      action: FINANCE_PERMISSION_ACTIONS.READ_CREDIT_MEMOS,
    });

    expect(decision).toEqual({
      allowed: false,
      reason: 'No applicable permission',
    });
  });

  it('gives deny precedence over allow', () => {
    const actor = createActor([
      {
        module: FINANCE_PERMISSION_MODULE,
        action: FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
        effect: 'allow',
      },
      {
        module: FINANCE_PERMISSION_MODULE,
        action: FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
        effect: 'deny',
      },
    ]);

    expect(
      evaluateFinanceAccess({
        actor,
        action: FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
      }),
    ).toEqual({ allowed: false, reason: 'Explicit deny' });
  });

  it('does not treat Nexus.Admin as a bypass', () => {
    const decision = evaluateFinanceAccess({
      actor: createActor([], ['Nexus.Admin']),
      action: FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
    });

    expect(decision.allowed).toBe(false);
  });

  it('ignores roles entirely', () => {
    const permission = {
      module: FINANCE_PERMISSION_MODULE,
      action: FINANCE_PERMISSION_ACTIONS.READ_CREDIT_MEMOS,
      effect: 'allow',
    } as const;

    const withoutRole = evaluateFinanceAccess({
      actor: createActor([permission]),
      action: FINANCE_PERMISSION_ACTIONS.READ_CREDIT_MEMOS,
    });
    const withRoles = evaluateFinanceAccess({
      actor: createActor([permission], ['Nexus.Admin', 'Finance.Reader']),
      action: FINANCE_PERMISSION_ACTIONS.READ_CREDIT_MEMOS,
    });

    expect(withRoles).toEqual(withoutRole);
  });
});
