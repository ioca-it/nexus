import type { Order } from '../order';
import type { OrderCustomerId, OrderId } from '../order.types';

export interface OrderRepository {
  create(order: Order): Promise<void>;

  update(order: Order): Promise<void>;

  findById(id: OrderId): Promise<Order | null>;

  findByCustomerId(customerId: OrderCustomerId): Promise<readonly Order[]>;
}
