import type { AuthenticatedActor } from '@nexus/platform';
import {
  Order,
  createOrderCustomerId,
  type OrderId,
  type OrderRepository,
} from '../../domain';
import type { OrderClock } from '../order-clock';
import { ORDERS_PERMISSION_ACTIONS } from '../security';
import {
  assertOrderAccess,
  requireOrderCustomerId,
} from './order-use-case-access';

export interface CreateDraftOrderRequest {
  readonly actor: AuthenticatedActor;
  readonly id: OrderId;
  readonly currencyCode: string;
}

export interface CreateDraftOrderDependencies {
  readonly repository: OrderRepository;
  readonly clock: OrderClock;
}

export class CreateDraftOrderUseCase {
  constructor(private readonly dependencies: CreateDraftOrderDependencies) {}

  async execute(request: CreateDraftOrderRequest): Promise<Order> {
    assertOrderAccess({
      actor: request.actor,
      action: ORDERS_PERMISSION_ACTIONS.CREATE_DRAFT,
      requireCustomer: true,
    });
    const customerId = createOrderCustomerId(
      requireOrderCustomerId(request.actor),
    );
    const timestamp = this.dependencies.clock();
    const order = Order.create({
      id: request.id,
      customerId,
      currencyCode: request.currencyCode,
      createdAt: new Date(timestamp.getTime()),
      updatedAt: new Date(timestamp.getTime()),
    });

    await this.dependencies.repository.create(order);

    return order;
  }
}
