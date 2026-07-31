import type { AuthenticatedActor, Permission } from '@nexus/platform';
import { createOrderCustomerId } from '../../domain';
import {
  evaluateOrderAccess,
  ORDERS_PERMISSION_ACTIONS,
  ORDERS_PERMISSION_MODULE,
} from './order-access-policy';

function permission(
  action: (typeof ORDERS_PERMISSION_ACTIONS)[keyof typeof ORDERS_PERMISSION_ACTIONS],
  effect: Permission['effect'] = 'allow',
): Permission {
  return Object.freeze({
    module: ORDERS_PERMISSION_MODULE,
    action,
    effect,
  });
}

function actor(
  options: {
    readonly customerId?: string | null;
    readonly permissions?: readonly Permission[];
    readonly roles?: readonly string[];
  } = {},
): AuthenticatedActor {
  return Object.freeze({
    userId: 'user-1',
    customerId:
      options.customerId === undefined ? 'customer-1' : options.customerId,
    permissions: Object.freeze([...(options.permissions ?? [])]),
    roles: Object.freeze([...(options.roles ?? [])]),
    approvalGroupIds: Object.freeze([]),
  });
}

describe('evaluateOrderAccess', () => {
  it('allows an explicit permission and freezes the decision', () => {
    const decision = evaluateOrderAccess({
      actor: actor({
        permissions: [permission(ORDERS_PERMISSION_ACTIONS.CREATE_DRAFT)],
      }),
      action: ORDERS_PERMISSION_ACTIONS.CREATE_DRAFT,
      requireCustomer: true,
    });

    expect(decision.allowed).toBe(true);
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it('denies by default when permission is absent', () => {
    expect(
      evaluateOrderAccess({
        actor: actor(),
        action: ORDERS_PERMISSION_ACTIONS.READ_ORDERS,
      }),
    ).toMatchObject({ allowed: false });
  });

  it('lets explicit deny prevail over explicit allow', () => {
    const decision = evaluateOrderAccess({
      actor: actor({
        permissions: [
          permission(ORDERS_PERMISSION_ACTIONS.UPDATE_DRAFT),
          permission(ORDERS_PERMISSION_ACTIONS.UPDATE_DRAFT, 'deny'),
        ],
      }),
      action: ORDERS_PERMISSION_ACTIONS.UPDATE_DRAFT,
    });

    expect(decision).toMatchObject({
      allowed: false,
      reason: 'Explicit deny',
    });
  });

  it('denies a customer actor that owns a different company', () => {
    const decision = evaluateOrderAccess({
      actor: actor({
        customerId: 'customer-1',
        permissions: [permission(ORDERS_PERMISSION_ACTIONS.READ_ORDERS)],
      }),
      action: ORDERS_PERMISSION_ACTIONS.READ_ORDERS,
      resourceCustomerId: createOrderCustomerId('customer-2'),
    });

    expect(decision).toMatchObject({
      allowed: false,
      reason: 'Order customer ownership mismatch',
    });
  });

  it('denies Nexus.Admin without an explicit permission', () => {
    const decision = evaluateOrderAccess({
      actor: actor({ customerId: null, roles: ['Nexus.Admin'] }),
      action: ORDERS_PERMISSION_ACTIONS.READ_ORDERS,
      resourceCustomerId: createOrderCustomerId('customer-1'),
    });

    expect(decision.allowed).toBe(false);
  });

  it('does not use roles in either direction', () => {
    expect(
      evaluateOrderAccess({
        actor: actor({
          roles: ['Orders.Reader', 'Nexus.Admin'],
          permissions: [permission(ORDERS_PERMISSION_ACTIONS.READ_ORDERS)],
        }),
        action: ORDERS_PERMISSION_ACTIONS.READ_ORDERS,
      }).allowed,
    ).toBe(true);
    expect(
      evaluateOrderAccess({
        actor: actor({ roles: ['Orders.Reader'] }),
        action: ORDERS_PERMISSION_ACTIONS.READ_ORDERS,
      }).allowed,
    ).toBe(false);
  });

  it('separates customer context from resource ownership', () => {
    const administrativeActor = actor({
      customerId: null,
      permissions: [permission(ORDERS_PERMISSION_ACTIONS.START_REVIEW)],
    });

    expect(
      evaluateOrderAccess({
        actor: administrativeActor,
        action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
        requireCustomer: true,
      }).allowed,
    ).toBe(false);
    expect(
      evaluateOrderAccess({
        actor: administrativeActor,
        action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
        resourceCustomerId: createOrderCustomerId('customer-1'),
        requireCustomer: false,
        requireOwnership: false,
      }).allowed,
    ).toBe(true);
  });

  it('defaults resource access to conservative ownership enforcement', () => {
    const differentCustomer = actor({
      customerId: 'customer-2',
      permissions: [permission(ORDERS_PERMISSION_ACTIONS.START_REVIEW)],
    });

    expect(
      evaluateOrderAccess({
        actor: differentCustomer,
        action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
        resourceCustomerId: createOrderCustomerId('customer-1'),
      }).allowed,
    ).toBe(false);

    const actorWithoutCustomer = actor({
      customerId: null,
      permissions: [permission(ORDERS_PERMISSION_ACTIONS.START_REVIEW)],
    });
    expect(
      evaluateOrderAccess({
        actor: actorWithoutCustomer,
        action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
        resourceCustomerId: createOrderCustomerId('customer-1'),
      }).allowed,
    ).toBe(false);
  });

  it('allows an administrative action without ownership when explicitly requested', () => {
    const differentCustomer = actor({
      customerId: 'customer-2',
      permissions: [permission(ORDERS_PERMISSION_ACTIONS.START_REVIEW)],
    });

    expect(
      evaluateOrderAccess({
        actor: differentCustomer,
        action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
        resourceCustomerId: createOrderCustomerId('customer-1'),
        requireCustomer: false,
        requireOwnership: false,
      }).allowed,
    ).toBe(true);
  });

  it('exports exactly the approved permission actions', () => {
    expect(ORDERS_PERMISSION_MODULE).toBe('orders');
    expect(ORDERS_PERMISSION_ACTIONS).toEqual({
      CREATE_DRAFT: 'create_draft',
      UPDATE_DRAFT: 'update_draft',
      READ_ORDERS: 'read_orders',
      SUBMIT: 'submit',
      RESUBMIT: 'resubmit',
      START_REVIEW: 'start_review',
      REQUEST_CHANGES: 'request_changes',
      REJECT: 'reject',
      APPROVE: 'approve',
    });
    expect(Object.isFrozen(ORDERS_PERMISSION_ACTIONS)).toBe(true);
  });
});
