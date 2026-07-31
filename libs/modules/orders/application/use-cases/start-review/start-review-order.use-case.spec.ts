import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createAuthenticatedActor,
  type ApplicationPipelineResult,
  type AuthenticatedActor,
  type Permission,
  type ProcessDecision,
  type StateTransition,
} from '@nexus/platform';
import * as OrdersPublicApi from '../../../index';
import {
  ORDER_STATUS,
  Order,
  createOrderCustomerId,
  createOrderId,
  createOrderLine,
  createOrderLineId,
  createOrderProductId,
  createOrderProductNumber,
  type OrderId,
  type OrderRepository,
  type OrderStatus,
} from '../../../domain';
import { ORDER_WORKFLOW } from '../../workflow';
import {
  ORDERS_PERMISSION_ACTIONS,
  ORDERS_PERMISSION_MODULE,
} from '../../security';
import {
  StartReviewOrderUseCase,
  type StartReviewOrderRequest,
} from './start-review-order.use-case';

const ORDER_ID = createOrderId('order-1');
const ORDER_CUSTOMER_ID = createOrderCustomerId('customer-1');
const UPDATED_AT = new Date('2026-08-02T15:30:00.000Z');

function permission(effect: Permission['effect'] = 'allow'): Permission {
  return Object.freeze({
    module: ORDERS_PERMISSION_MODULE,
    action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
    effect,
  });
}

function actor(
  overrides: Partial<{
    customerId: string | null;
    permissions: readonly Permission[];
    roles: readonly string[];
  }> = {},
): AuthenticatedActor {
  return createAuthenticatedActor({
    userId: 'actor-1',
    customerId:
      overrides.customerId === undefined
        ? ORDER_CUSTOMER_ID
        : overrides.customerId,
    roles: overrides.roles ?? [],
    permissions: overrides.permissions ?? [permission()],
    approvalGroupIds: [],
  });
}

function submittedOrder(): Order {
  return Order.create({
    id: ORDER_ID,
    customerId: ORDER_CUSTOMER_ID,
    currencyCode: 'USD',
    lines: [
      createOrderLine({
        id: createOrderLineId('line-1'),
        productId: createOrderProductId('product-1'),
        productNumber: createOrderProductNumber('SKU-1'),
        productName: 'Product one',
        quantity: 2,
        unitOfMeasureCode: 'EA',
        currencyCode: 'USD',
        unitPrice: 12.5,
      }),
    ],
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: new Date('2026-07-30T11:00:00.000Z'),
  }).transitionTo(ORDER_STATUS.SUBMITTED, new Date('2026-07-30T12:00:00.000Z'));
}

function orderWithStatus(status: OrderStatus): Order {
  const order = submittedOrder();
  return status === ORDER_STATUS.SUBMITTED
    ? order
    : order.transitionTo(status, new Date('2026-07-30T13:00:00.000Z'));
}

function repository(
  order: Order | null = submittedOrder(),
): jest.Mocked<OrderRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(order),
    findByCustomerId: jest.fn().mockResolvedValue([]),
  };
}

function pipelineResult(
  overrides: Partial<ProcessDecision> = {},
): ApplicationPipelineResult {
  const processDecision: ProcessDecision = {
    allowed: true,
    valid: true,
    nextState: ORDER_STATUS.UNDER_REVIEW,
    requireApproval: false,
    notificationsEnabled: false,
    reason: 'Process allowed',
    ...overrides,
  };

  return Object.freeze({ ...processDecision, processDecision });
}

function stateTransition(
  result: ApplicationPipelineResult = pipelineResult(),
): jest.Mocked<StateTransition<Order>> {
  return {
    execute: jest.fn(({ entity }) => ({ entity, pipelineResult: result })),
  };
}

describe('StartReviewOrderUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('is exported publicly and its request contract requires actor and id', () => {
    const request: StartReviewOrderRequest = { actor: actor(), id: ORDER_ID };

    expect(OrdersPublicApi.StartReviewOrderUseCase).toBe(
      StartReviewOrderUseCase,
    );
    expect(request).toEqual({ actor: expect.any(Object), id: ORDER_ID });
  });

  it('normalizes id, finds once, and uses the documented not-found error', async () => {
    const repo = repository(null);
    const transition = stateTransition();
    const useCase = new StartReviewOrderUseCase({
      repository: repo,
      stateTransition: transition,
    });

    await expect(
      useCase.execute({ actor: actor(), id: ' order-1 ' as OrderId }),
    ).rejects.toThrow('Order not found');
    expect(repo.findById).toHaveBeenCalledTimes(1);
    expect(repo.findById).toHaveBeenCalledWith(ORDER_ID);
    expect(transition.execute).not.toHaveBeenCalled();
  });

  it('uses the real SUBMITTED state, START_REVIEW action and shared workflow', async () => {
    const repo = repository();
    const transition = stateTransition();
    const useCase = new StartReviewOrderUseCase({
      repository: repo,
      stateTransition: transition,
      clock: () => UPDATED_AT,
    });

    await useCase.execute({ actor: actor(), id: ORDER_ID });
    const context = transition.execute.mock.calls[0][0];

    expect(transition.execute).toHaveBeenCalledTimes(1);
    expect(context.processRequest.currentState).toBe(ORDER_STATUS.SUBMITTED);
    expect(context.processRequest.action).toBe(
      ORDERS_PERMISSION_ACTIONS.START_REVIEW,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      ORDER_WORKFLOW,
    );
    expect(
      context.processRequest.workflowConfiguration.routes[0].approvalGroupIds,
    ).toEqual([]);
  });

  it('allows an administrative actor without customer context or ownership', async () => {
    const otherCustomerOrder = submittedOrder();
    const repo = repository(otherCustomerOrder);
    const transition = stateTransition();
    const useCase = new StartReviewOrderUseCase({
      repository: repo,
      stateTransition: transition,
      clock: () => UPDATED_AT,
    });

    const result = await useCase.execute({
      actor: actor({ customerId: null, roles: ['Nexus.Admin'] }),
      id: ORDER_ID,
    });

    expect(result.order.status).toBe(ORDER_STATUS.UNDER_REVIEW);
    expect(transition.execute).toHaveBeenCalledTimes(1);
  });

  it('allows a different customer with explicit permission because ownership is not required', async () => {
    const useCase = new StartReviewOrderUseCase({
      repository: repository(),
      stateTransition: stateTransition(),
      clock: () => UPDATED_AT,
    });

    const result = await useCase.execute({
      actor: actor({ customerId: 'other-customer' }),
      id: ORDER_ID,
    });

    expect(result.order.status).toBe(ORDER_STATUS.UNDER_REVIEW);
  });

  it('transitions immutably, preserves the snapshot and persists updatedOrder once', async () => {
    const original = submittedOrder();
    const repo = repository(original);
    const resultFromPipeline = pipelineResult();
    const transition = stateTransition(resultFromPipeline);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const transitionTo = jest.spyOn(Order.prototype, 'transitionTo');
    const useCase = new StartReviewOrderUseCase({
      repository: repo,
      stateTransition: transition,
      clock,
    });

    const result = await useCase.execute({ actor: actor(), id: ORDER_ID });

    expect(result.pipelineResult).toBe(resultFromPipeline);
    expect(result.order).not.toBe(original);
    expect(result.order.status).toBe(ORDER_STATUS.UNDER_REVIEW);
    expect(result.order.updatedAt).toEqual(UPDATED_AT);
    expect(result.order.id).toBe(original.id);
    expect(result.order.customerId).toBe(original.customerId);
    expect(result.order.currencyCode).toBe(original.currencyCode);
    expect(result.order.lines).toEqual(original.lines);
    expect(result.order.subtotal).toBe(original.subtotal);
    expect(result.order.createdAt).toEqual(original.createdAt);
    expect(original.status).toBe(ORDER_STATUS.SUBMITTED);
    expect(clock).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledWith(
      ORDER_STATUS.UNDER_REVIEW,
      UPDATED_AT,
    );
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledWith(result.order);
    expect(repo.update).not.toHaveBeenCalledWith(original);
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const useCase = new StartReviewOrderUseCase({
      repository: repository(),
      stateTransition: stateTransition(),
    });

    const result = await useCase.execute({ actor: actor(), id: ORDER_ID });

    expect(result.order.updatedAt).toEqual(UPDATED_AT);
  });

  it.each([
    ['without permission', actor({ permissions: [] })],
    [
      'with deny overriding allow',
      actor({ permissions: [permission(), permission('deny')] }),
    ],
    [
      'as Nexus.Admin without permission',
      actor({ customerId: null, permissions: [], roles: ['Nexus.Admin'] }),
    ],
  ])(
    'denies %s before transition, clock and persistence',
    async (_name, deniedActor) => {
      const repo = repository();
      const transition = stateTransition();
      const clock = jest.fn(() => UPDATED_AT);
      const useCase = new StartReviewOrderUseCase({
        repository: repo,
        stateTransition: transition,
        clock,
      });

      await expect(
        useCase.execute({ actor: deniedActor, id: ORDER_ID }),
      ).rejects.toThrow('Order access denied');
      expect(transition.execute).not.toHaveBeenCalled();
      expect(clock).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  it('ignores arbitrary roles when permission is valid', async () => {
    const useCase = new StartReviewOrderUseCase({
      repository: repository(),
      stateTransition: stateTransition(),
      clock: () => UPDATED_AT,
    });

    const result = await useCase.execute({
      actor: actor({ roles: ['irrelevant-role'] }),
      id: ORDER_ID,
    });

    expect(result.order.status).toBe(ORDER_STATUS.UNDER_REVIEW);
  });

  it.each([
    ORDER_STATUS.DRAFT,
    ORDER_STATUS.UNDER_REVIEW,
    ORDER_STATUS.CHANGES_REQUESTED,
    ORDER_STATUS.REJECTED,
    ORDER_STATUS.APPROVED,
  ])('denies start review from real %s without effects', async (status) => {
    const repo = repository(orderWithStatus(status));
    const transition = stateTransition();
    const clock = jest.fn(() => UPDATED_AT);
    const useCase = new StartReviewOrderUseCase({
      repository: repo,
      stateTransition: transition,
      clock,
    });

    await expect(
      useCase.execute({ actor: actor(), id: ORDER_ID }),
    ).rejects.toThrow('Order workflow transition is not allowed');
    expect(transition.execute).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it.each([
    [
      'denied',
      pipelineResult({
        allowed: false,
        nextState: null,
        reason: 'Explicit deny',
      }),
    ],
    [
      'invalid',
      pipelineResult({
        valid: false,
        nextState: null,
        reason: 'Invalid workflow',
      }),
    ],
  ])(
    'returns original order for a %s pipeline result',
    async (_name, resultFromPipeline) => {
      const original = submittedOrder();
      const repo = repository(original);
      const clock = jest.fn(() => UPDATED_AT);
      const transitionTo = jest.spyOn(Order.prototype, 'transitionTo');
      const useCase = new StartReviewOrderUseCase({
        repository: repo,
        stateTransition: stateTransition(resultFromPipeline),
        clock,
      });

      const result = await useCase.execute({ actor: actor(), id: ORDER_ID });

      expect(result).toEqual({
        order: original,
        pipelineResult: resultFromPipeline,
      });
      expect(result.order).toBe(original);
      expect(clock).not.toHaveBeenCalled();
      expect(transitionTo).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['approval requirement', pipelineResult({ requireApproval: true })],
    [
      'unexpected next state',
      pipelineResult({ nextState: ORDER_STATUS.SUBMITTED }),
    ],
  ])(
    'rejects an inconsistent %s without effects',
    async (_name, resultFromPipeline) => {
      const repo = repository();
      const clock = jest.fn(() => UPDATED_AT);
      const transitionTo = jest.spyOn(Order.prototype, 'transitionTo');
      const useCase = new StartReviewOrderUseCase({
        repository: repo,
        stateTransition: stateTransition(resultFromPipeline),
        clock,
      });

      await expect(
        useCase.execute({ actor: actor(), id: ORDER_ID }),
      ).rejects.toThrow('Order start review pipeline result is inconsistent');
      expect(clock).not.toHaveBeenCalled();
      expect(transitionTo).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  it('propagates repository, StateTransition and update errors unchanged', async () => {
    const readError = new Error('read failed');
    const transitionError = new Error('transition failed');
    const updateError = new Error('update failed');

    const readRepo = repository();
    readRepo.findById.mockRejectedValue(readError);
    await expect(
      new StartReviewOrderUseCase({
        repository: readRepo,
        stateTransition: stateTransition(),
      }).execute({ actor: actor(), id: ORDER_ID }),
    ).rejects.toBe(readError);

    const failingTransition = stateTransition();
    failingTransition.execute.mockImplementation(() => {
      throw transitionError;
    });
    await expect(
      new StartReviewOrderUseCase({
        repository: repository(),
        stateTransition: failingTransition,
      }).execute({ actor: actor(), id: ORDER_ID }),
    ).rejects.toBe(transitionError);

    const updateRepo = repository();
    updateRepo.update.mockRejectedValue(updateError);
    await expect(
      new StartReviewOrderUseCase({
        repository: updateRepo,
        stateTransition: stateTransition(),
      }).execute({ actor: actor(), id: ORDER_ID }),
    ).rejects.toBe(updateError);
  });

  it('contains no external integrations or commercial recalculation', () => {
    const source = readFileSync(
      join(__dirname, 'start-review-order.use-case.ts'),
      'utf8',
    );
    const requestContract = source.slice(
      source.indexOf('export interface StartReviewOrderRequest'),
      source.indexOf('export interface StartReviewOrderResult'),
    );

    expect(requestContract).not.toMatch(
      /customerId|status|lines|price|subtotal|approvalGroup/i,
    );
    expect(source).not.toMatch(
      /CommercialCatalog|inventory|BusinessCentral|Dataverse|ecommerceUrl|notification|actor\.roles|Nexus\.Admin|unitPrice|lineSubtotal|calculateSubtotal/i,
    );
    expect(source).not.toMatch(/currentState\s*:\s*ORDER_STATUS\.SUBMITTED/);
  });
});
