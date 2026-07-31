import type {
  ApplicationPipelineResult,
  AuthenticatedActor,
  StateTransition,
} from '@nexus/platform';
import {
  ORDER_STATUS,
  createOrderId,
  type Order,
  type OrderId,
  type OrderRepository,
} from '../../../domain';
import type { OrderClock } from '../../order-clock';
import { createOrderProcessRequest } from '../../process';
import { ORDERS_PERMISSION_ACTIONS } from '../../security';
import { assertOrderAccess } from '../order-use-case-access';

export interface SubmitOrderRequest {
  readonly actor: AuthenticatedActor;
  readonly id: OrderId;
}

export interface SubmitOrderResult {
  readonly order: Order;
  readonly pipelineResult: ApplicationPipelineResult;
}

export interface SubmitOrderDependencies {
  readonly repository: OrderRepository;
  readonly stateTransition: StateTransition<Order>;
  readonly clock: OrderClock;
}

const PIPELINE_INCONSISTENCY_MESSAGE =
  'Order submit pipeline result is inconsistent';

export class SubmitOrderUseCase {
  private readonly repository: OrderRepository;
  private readonly stateTransition: StateTransition<Order>;
  private readonly clock: OrderClock;

  constructor(dependencies: {
    readonly repository: OrderRepository;
    readonly stateTransition: StateTransition<Order>;
    readonly clock?: OrderClock;
  }) {
    this.repository = dependencies.repository;
    this.stateTransition = dependencies.stateTransition;
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async execute(request: SubmitOrderRequest): Promise<SubmitOrderResult> {
    const id = createOrderId(request.id);
    const order = await this.repository.findById(id);

    if (order === null) {
      throw new Error('Order not found');
    }

    assertOrderAccess({
      actor: request.actor,
      action: ORDERS_PERMISSION_ACTIONS.SUBMIT,
      resourceCustomerId: order.customerId,
      requireCustomer: true,
    });

    const { pipelineResult } = this.stateTransition.execute({
      entity: order,
      processRequest: createOrderProcessRequest({
        actor: request.actor,
        order,
        action: ORDERS_PERMISSION_ACTIONS.SUBMIT,
      }),
    });

    if (!pipelineResult.allowed || !pipelineResult.valid) {
      return { order, pipelineResult };
    }

    if (
      pipelineResult.requireApproval ||
      pipelineResult.nextState !== ORDER_STATUS.SUBMITTED
    ) {
      throw new Error(PIPELINE_INCONSISTENCY_MESSAGE);
    }

    const updatedAt = this.clock();
    const updatedOrder = order.transitionTo(ORDER_STATUS.SUBMITTED, updatedAt);

    await this.repository.update(updatedOrder);

    return { order: updatedOrder, pipelineResult };
  }
}
