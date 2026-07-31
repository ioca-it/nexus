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

export interface StartReviewOrderRequest {
  readonly actor: AuthenticatedActor;
  readonly id: OrderId;
}

export interface StartReviewOrderResult {
  readonly order: Order;
  readonly pipelineResult: ApplicationPipelineResult;
}

export interface StartReviewOrderDependencies {
  readonly repository: OrderRepository;
  readonly stateTransition: StateTransition<Order>;
  readonly clock: OrderClock;
}

const PIPELINE_INCONSISTENCY_MESSAGE =
  'Order start review pipeline result is inconsistent';

export class StartReviewOrderUseCase {
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

  async execute(
    request: StartReviewOrderRequest,
  ): Promise<StartReviewOrderResult> {
    const id = createOrderId(request.id);
    const order = await this.repository.findById(id);

    if (order === null) {
      throw new Error('Order not found');
    }

    assertOrderAccess({
      actor: request.actor,
      action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
      resourceCustomerId: order.customerId,
      requireCustomer: false,
      requireOwnership: false,
    });

    const { pipelineResult } = this.stateTransition.execute({
      entity: order,
      processRequest: createOrderProcessRequest({
        actor: request.actor,
        order,
        action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
      }),
    });

    if (!pipelineResult.allowed || !pipelineResult.valid) {
      return { order, pipelineResult };
    }

    if (
      pipelineResult.requireApproval ||
      pipelineResult.nextState !== ORDER_STATUS.UNDER_REVIEW
    ) {
      throw new Error(PIPELINE_INCONSISTENCY_MESSAGE);
    }

    const updatedOrder = order.transitionTo(
      ORDER_STATUS.UNDER_REVIEW,
      this.clock(),
    );

    await this.repository.update(updatedOrder);

    return { order: updatedOrder, pipelineResult };
  }
}
