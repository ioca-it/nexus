import type { AuthenticatedActor } from '@nexus/platform';
import { Order, createOrderCustomerId, createOrderId } from '../../domain';
import { createOrderProcessRequest } from './order-process-request.factory';
import { ORDERS_PERMISSION_ACTIONS } from '../security';

const actor = {
  userId: 'u1',
  customerId: 'c1',
  permissions: Object.freeze([
    { module: 'orders', action: 'submit', effect: 'allow' as const },
  ]),
  approvalGroupIds: Object.freeze([]),
  roles: Object.freeze([]),
} as unknown as AuthenticatedActor;
const order = Order.create({
  id: createOrderId('o1'),
  customerId: createOrderCustomerId('c1'),
  currencyCode: 'USD',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

describe('createOrderProcessRequest', () => {
  it('builds a frozen request without approval groups for submit', () => {
    const request = createOrderProcessRequest({
      actor,
      order,
      action: ORDERS_PERMISSION_ACTIONS.SUBMIT,
    });
    expect(request.currentState).toBe('DRAFT');
    expect(request.workflowConfiguration.workflows[0]).toBeDefined();
    expect(Object.isFrozen(request)).toBe(true);
  });
  it('requires groups for approval transitions', () => {
    expect(() =>
      createOrderProcessRequest({
        actor,
        order: order.transitionTo('UNDER_REVIEW', new Date('2026-01-02')),
        action: ORDERS_PERMISSION_ACTIONS.APPROVE,
      }),
    ).toThrow();
  });
});
