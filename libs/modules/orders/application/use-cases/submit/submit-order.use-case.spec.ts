import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createAuthenticatedActor,
  createStateTransition as createPlatformStateTransition,
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
  SubmitOrderUseCase,
  type SubmitOrderRequest,
} from './submit-order.use-case';

const ORDER_ID = createOrderId('order-1');
const CUSTOMER_ID = createOrderCustomerId('customer-1');
const UPDATED_AT = new Date('2026-07-31T15:30:00.000Z');

function permission(effect: Permission['effect'] = 'allow'): Permission {
  return Object.freeze({
    module: ORDERS_PERMISSION_MODULE,
    action: ORDERS_PERMISSION_ACTIONS.SUBMIT,
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
      overrides.customerId === undefined ? CUSTOMER_ID : overrides.customerId,
    roles: overrides.roles ?? [],
    permissions: overrides.permissions ?? [permission()],
    approvalGroupIds: [],
  });
}

function draftOrder(): Order {
  return Order.create({
    id: ORDER_ID,
    customerId: CUSTOMER_ID,
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
  });
}

function orderWithStatus(status: OrderStatus): Order {
  const order = draftOrder();
  return status === ORDER_STATUS.DRAFT
    ? order
    : order.transitionTo(status, new Date('2026-07-30T12:00:00.000Z'));
}

function repository(
  order: Order | null = draftOrder(),
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
    nextState: ORDER_STATUS.SUBMITTED,
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

describe('SubmitOrderUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('is exported publicly and its request contract accepts only actor and id', () => {
    const request: SubmitOrderRequest = { actor: actor(), id: ORDER_ID };

    expect(OrdersPublicApi.SubmitOrderUseCase).toBe(SubmitOrderUseCase);
    expect(request).toEqual({ actor: expect.any(Object), id: ORDER_ID });
  });

  it('normalizes the id, loads once, and propagates not-found safely', async () => {
    const repo = repository(null);
    const transition = stateTransition();
    const useCase = new SubmitOrderUseCase({
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

  it('uses the real state, submit action, shared workflow, and StateTransition once', async () => {
    const original = draftOrder();
    const repo = repository(original);
    const transition = stateTransition();
    const useCase = new SubmitOrderUseCase({
      repository: repo,
      stateTransition: transition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ actor: actor(), id: ORDER_ID });
    const context = transition.execute.mock.calls[0][0];

    expect(transition.execute).toHaveBeenCalledTimes(1);
    expect(context.entity).toBe(original);
    expect(context.processRequest.currentState).toBe(original.status);
    expect(context.processRequest.action).toBe(
      ORDERS_PERMISSION_ACTIONS.SUBMIT,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      ORDER_WORKFLOW,
    );
    expect(
      context.processRequest.workflowConfiguration.routes[0].approvalGroupIds,
    ).toEqual([]);
  });

  it('transitions immutably, preserves the snapshot, persists once, and returns the full result', async () => {
    const original = draftOrder();
    const originalSnapshot = {
      id: original.id,
      customerId: original.customerId,
      currencyCode: original.currencyCode,
      lines: original.lines,
      subtotal: original.subtotal,
      createdAt: original.createdAt,
      status: original.status,
      updatedAt: original.updatedAt,
    };
    const repo = repository(original);
    const resultFromPipeline = pipelineResult();
    const transition = stateTransition(resultFromPipeline);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const transitionTo = jest.spyOn(Order.prototype, 'transitionTo');
    const useCase = new SubmitOrderUseCase({
      repository: repo,
      stateTransition: transition,
      clock,
    });

    const result = await useCase.execute({ actor: actor(), id: ORDER_ID });

    expect(result.pipelineResult).toBe(resultFromPipeline);
    expect(result.order).not.toBe(original);
    expect(result.order.status).toBe(ORDER_STATUS.SUBMITTED);
    expect(result.order.updatedAt).toEqual(UPDATED_AT);
    expect(result.order).toMatchObject({
      id: originalSnapshot.id,
      customerId: originalSnapshot.customerId,
      currencyCode: originalSnapshot.currencyCode,
      lines: originalSnapshot.lines,
      subtotal: originalSnapshot.subtotal,
    });
    expect(result.order.createdAt).toEqual(originalSnapshot.createdAt);
    expect(original.status).toBe(originalSnapshot.status);
    expect(original.updatedAt).toEqual(originalSnapshot.updatedAt);
    expect(original.lines).toBe(originalSnapshot.lines);
    expect(clock).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledWith(
      ORDER_STATUS.SUBMITTED,
      UPDATED_AT,
    );
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledWith(result.order);
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const useCase = new SubmitOrderUseCase({
      repository: repository(),
      stateTransition: stateTransition(),
    });

    const result = await useCase.execute({ actor: actor(), id: ORDER_ID });

    expect(result.order.updatedAt).toEqual(UPDATED_AT);
  });

  it.each([
    ['without permission', actor({ permissions: [] })],
    [
      'with explicit deny overriding allow',
      actor({ permissions: [permission(), permission('deny')] }),
    ],
    ['without customer context', actor({ customerId: null })],
    ['for another customer', actor({ customerId: 'customer-2' })],
    [
      'as Nexus.Admin without permission',
      actor({ permissions: [], roles: ['Nexus.Admin'] }),
    ],
  ])(
    'denies %s before transition, clock, and persistence',
    async (_name, deniedActor) => {
      const repo = repository();
      const transition = stateTransition();
      const clock = jest.fn(() => UPDATED_AT);
      const useCase = new SubmitOrderUseCase({
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

  it('does not use roles when an explicit permission and ownership are present', async () => {
    const repo = repository();
    const useCase = new SubmitOrderUseCase({
      repository: repo,
      stateTransition: stateTransition(pipelineResult()),
      clock: () => UPDATED_AT,
    });

    await expect(
      useCase.execute({
        actor: actor({ roles: ['unrelated-role'] }),
        id: ORDER_ID,
      }),
    ).resolves.toMatchObject({ order: { status: ORDER_STATUS.SUBMITTED } });
  });

  it.each([
    ORDER_STATUS.SUBMITTED,
    ORDER_STATUS.CHANGES_REQUESTED,
    ORDER_STATUS.UNDER_REVIEW,
    ORDER_STATUS.REJECTED,
    ORDER_STATUS.APPROVED,
  ])('denies submit from the real %s state without effects', async (status) => {
    const original = orderWithStatus(status);
    const repo = repository(original);
    const transition = createPlatformStateTransition<Order>();
    const execute = jest.spyOn(transition, 'execute');
    const clock = jest.fn(() => UPDATED_AT);
    const useCase = new SubmitOrderUseCase({
      repository: repo,
      stateTransition: transition,
      clock,
    });

    await expect(
      useCase.execute({ actor: actor(), id: ORDER_ID }),
    ).rejects.toThrow('Order workflow transition is not allowed');
    expect(execute).not.toHaveBeenCalled();
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
    'returns the original order for a %s pipeline result without effects',
    async (_name, resultFromPipeline) => {
      const original = draftOrder();
      const repo = repository(original);
      const clock = jest.fn(() => UPDATED_AT);
      const transitionTo = jest.spyOn(Order.prototype, 'transitionTo');
      const useCase = new SubmitOrderUseCase({
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
      pipelineResult({ nextState: ORDER_STATUS.APPROVED }),
    ],
  ])(
    'rejects an inconsistent %s without effects',
    async (_name, resultFromPipeline) => {
      const repo = repository();
      const clock = jest.fn(() => UPDATED_AT);
      const transitionTo = jest.spyOn(Order.prototype, 'transitionTo');
      const useCase = new SubmitOrderUseCase({
        repository: repo,
        stateTransition: stateTransition(resultFromPipeline),
        clock,
      });

      await expect(
        useCase.execute({ actor: actor(), id: ORDER_ID }),
      ).rejects.toThrow('Order submit pipeline result is inconsistent');
      expect(clock).not.toHaveBeenCalled();
      expect(transitionTo).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  it('awaits persistence and propagates repository and StateTransition errors unchanged', async () => {
    const readError = new Error('read failed');
    const transitionError = new Error('transition failed');
    const updateError = new Error('update failed');

    const readRepo = repository();
    readRepo.findById.mockRejectedValue(readError);
    await expect(
      new SubmitOrderUseCase({
        repository: readRepo,
        stateTransition: stateTransition(),
      }).execute({
        actor: actor(),
        id: ORDER_ID,
      }),
    ).rejects.toBe(readError);

    const failingTransition = stateTransition();
    failingTransition.execute.mockImplementation(() => {
      throw transitionError;
    });
    await expect(
      new SubmitOrderUseCase({
        repository: repository(),
        stateTransition: failingTransition,
      }).execute({
        actor: actor(),
        id: ORDER_ID,
      }),
    ).rejects.toBe(transitionError);

    const updateRepo = repository();
    updateRepo.update.mockRejectedValue(updateError);
    await expect(
      new SubmitOrderUseCase({
        repository: updateRepo,
        stateTransition: stateTransition(),
      }).execute({
        actor: actor(),
        id: ORDER_ID,
      }),
    ).rejects.toBe(updateError);
  });

  it('contains no external integrations, commercial inputs, notifications, or recalculation', () => {
    const source = readFileSync(
      join(__dirname, 'submit-order.use-case.ts'),
      'utf8',
    );
    const requestContract = source.slice(
      source.indexOf('export interface SubmitOrderRequest'),
      source.indexOf('export interface SubmitOrderResult'),
    );

    expect(requestContract).not.toMatch(
      /customerId|status|lines|price|subtotal|approvalGroup/i,
    );
    expect(source).not.toMatch(
      /CommercialCatalog|inventory|BusinessCentral|Dataverse|ecommerceUrl|notification|actor\.roles|Nexus\.Admin|unitPrice|lineSubtotal|calculateSubtotal/i,
    );
    expect(source).not.toMatch(/currentState\s*:\s*ORDER_STATUS\.DRAFT/);
  });
});
