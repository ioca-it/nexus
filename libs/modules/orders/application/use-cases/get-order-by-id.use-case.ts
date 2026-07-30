import type { AuthenticatedActor } from '@nexus/platform';
import type { Order, OrderId, OrderRepository } from '../../domain';
import { ORDERS_PERMISSION_ACTIONS } from '../security';
import {
  assertOrderAccess,
  assertOrderPermission,
} from './order-use-case-access';

export interface GetOrderByIdRequest {
  readonly actor: AuthenticatedActor;
  readonly id: OrderId;
}

export interface GetOrderByIdDependencies {
  readonly repository: OrderRepository;
}

export class GetOrderByIdUseCase {
  constructor(private readonly dependencies: GetOrderByIdDependencies) {}

  async execute(request: GetOrderByIdRequest): Promise<Order | null> {
    assertOrderPermission(request.actor, ORDERS_PERMISSION_ACTIONS.READ_ORDERS);
    const order = await this.dependencies.repository.findById(request.id);

    if (order === null) {
      return null;
    }

    assertOrderAccess({
      actor: request.actor,
      action: ORDERS_PERMISSION_ACTIONS.READ_ORDERS,
      resourceCustomerId: order.customerId,
    });

    return order;
  }
}
