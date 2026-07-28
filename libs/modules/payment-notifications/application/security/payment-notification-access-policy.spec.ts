import {
  createAuthenticatedActor,
  type AuthenticatedActor,
  type Permission,
} from '@nexus/platform';
import {
  PAYMENT_NOTIFICATION_PERMISSION_ACTIONS,
  PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
} from '../payment-notification-workflow';
import { evaluatePaymentNotificationAccess } from './payment-notification-access-policy';

const ACTION = PAYMENT_NOTIFICATION_PERMISSION_ACTIONS.UPDATE;

function permission(effect: 'allow' | 'deny'): Permission {
  return {
    module: PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
    action: ACTION,
    effect,
  };
}

function createActor(
  permissions: readonly Permission[] = [permission('allow')],
  customerId: string | null = 'customer-1',
  roles: readonly string[] = [],
): AuthenticatedActor {
  return createAuthenticatedActor({
    userId: 'actor-1',
    customerId,
    roles,
    permissions,
    approvalGroupIds: [],
  });
}

describe('evaluatePaymentNotificationAccess', () => {
  it('allows an explicit permission', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor(),
        action: ACTION,
      }),
    ).toEqual({
      allowed: true,
      valid: true,
      reason: 'Payment notification access allowed',
    });
  });

  it('denies when no applicable permission exists', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor([]),
        action: ACTION,
      }),
    ).toMatchObject({
      allowed: false,
      valid: true,
      reason: 'No applicable permission',
    });
  });

  it('gives explicit deny precedence over allow', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor([permission('allow'), permission('deny')]),
        action: ACTION,
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'Explicit deny',
    });
  });

  it('does not grant a bypass to Nexus.Admin', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor([], null, ['Nexus.Admin']),
        action: ACTION,
      }).allowed,
    ).toBe(false);
  });

  it('allows a customer to access its own resource', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor(),
        action: ACTION,
        resourceCustomerId: 'customer-1',
      }).allowed,
    ).toBe(true);
  });

  it('denies a customer accessing another customer resource', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor(),
        action: ACTION,
        resourceCustomerId: 'customer-2',
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'Payment notification access denied',
    });
  });

  it('denies a missing customer when the operation requires one', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor([permission('allow')], null),
        action: ACTION,
        requireCustomer: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'Customer context is required',
    });
  });

  it('allows an actor without customer context only with an explicit permission', () => {
    expect(
      evaluatePaymentNotificationAccess({
        actor: createActor([permission('allow')], null),
        action: ACTION,
        resourceCustomerId: 'customer-2',
      }).allowed,
    ).toBe(true);
  });

  it('does not modify the actor or its permissions', () => {
    const actor = createActor();
    const original = structuredClone(actor);

    evaluatePaymentNotificationAccess({
      actor,
      action: ACTION,
      resourceCustomerId: 'customer-1',
    });

    expect(actor).toEqual(original);
    expect(Object.isFrozen(actor)).toBe(true);
    expect(Object.isFrozen(actor.permissions)).toBe(true);
  });
});
