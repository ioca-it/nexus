import type { AuthenticatedActor } from '@nexus/platform';
import type { Order, OrderRepository } from '../../domain';
import { ORDERS_PERMISSION_ACTIONS } from '../security';
import {
  assertOrderAccess,
  requireOrderCustomerId,
} from './order-use-case-access';

export interface ListCustomerOrdersRequest {
  readonly actor: AuthenticatedActor;
}

export interface ListCustomerOrdersDependencies {
  readonly repository: OrderRepository;
}

export class ListCustomerOrdersUseCase {
  constructor(private readonly dependencies: ListCustomerOrdersDependencies) {}

  async execute(request: ListCustomerOrdersRequest): Promise<readonly Order[]> {
    assertOrderAccess({
      actor: request.actor,
      action: ORDERS_PERMISSION_ACTIONS.READ_ORDERS,
      requireCustomer: true,
    });
    const customerId = requireOrderCustomerId(request.actor);
    const orders =
      await this.dependencies.repository.findByCustomerId(customerId);

    return Object.freeze([...orders]);
  }
}
