import { ORDER_STATUS } from '../../../domain/order-status';
import { Order } from '../../../domain/order';
import type { OrderRecord } from '../common/orders-dataverse.types';
import type { OrderLineRecord } from '../common/orders-dataverse.types';
import { validateOrderRecord } from '../common/orders-dataverse.validators';
import { toOrderLine } from './order-line.mapper';

export function toOrderRecord(order: Order): OrderRecord {
  return Object.freeze({
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    currencyCode: order.currencyCode,
    subtotal: order.subtotal,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
}

export function toOrder(
  record: OrderRecord,
  lines: readonly OrderLineRecord[],
): Order {
  const value = validateOrderRecord(record);
  if (value.status !== ORDER_STATUS.DRAFT)
    throw new Error('Only DRAFT orders are supported');
  const order = Order.create({
    id: value.id as never,
    customerId: value.customerId as never,
    currencyCode: value.currencyCode,
    createdAt: new Date(value.createdAt),
    updatedAt: new Date(value.updatedAt),
    lines: lines.map(toOrderLine),
  });
  if (order.subtotal !== value.subtotal)
    throw new Error('Order subtotal does not match its lines');
  return order;
}
