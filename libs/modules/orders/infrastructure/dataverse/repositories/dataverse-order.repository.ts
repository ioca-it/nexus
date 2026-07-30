import type { OrderRepository } from '../../../domain/repositories/order.repository';
import type { Order } from '../../../domain/order';
import type { OrderId, OrderCustomerId } from '../../../domain/order.types';
import type { OrderGateway } from '../orders/order.gateway';
import type { OrderLineGateway } from '../order-lines/order-line.gateway';
import { toOrder, toOrderRecord } from '../mappers/order.mapper';
import { toOrderLineRecord } from '../mappers/order-line.mapper';

export class DataverseOrderRepository implements OrderRepository {
  constructor(
    private readonly orders: OrderGateway,
    private readonly lines: OrderLineGateway,
  ) {
    Object.freeze(this);
  }
  async create(order: Order): Promise<void> {
    await this.orders.create(toOrderRecord(order));
    for (const line of order.lines)
      await this.lines.create(toOrderLineRecord(line, order.id));
  }
  async update(order: Order): Promise<void> {
    await this.orders.update(toOrderRecord(order));
    for (const line of order.lines)
      await this.lines.update(toOrderLineRecord(line, order.id));
  }
  async findById(id: OrderId): Promise<Order | null> {
    const record = await this.orders.findOne(id);
    if (record === null) return null;
    const lineRecords = await this.lines.query({ orderId: record.id });
    return toOrder(record, lineRecords);
  }
  async findByCustomerId(
    customerId: OrderCustomerId,
  ): Promise<readonly Order[]> {
    const records = await this.orders.query({ customerId });
    const result: Order[] = [];
    for (const record of records)
      result.push(
        toOrder(record, await this.lines.query({ orderId: record.id })),
      );
    return Object.freeze(result);
  }
}
