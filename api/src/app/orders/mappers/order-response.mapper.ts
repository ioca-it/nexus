import type { Order, OrderLine } from '@nexus/modules/orders';
import type { OrderLineResponse, OrderResponse } from '../contracts';

export function toOrderLineResponse(line: OrderLine): OrderLineResponse {
  return Object.freeze({
    id: line.id,
    productId: line.productId,
    productNumber: line.productNumber,
    productName: line.productName,
    quantity: line.quantity,
    ...(line.unitOfMeasureCode === undefined
      ? {}
      : { unitOfMeasureCode: line.unitOfMeasureCode }),
    currencyCode: line.currencyCode,
    unitPrice: line.unitPrice,
    lineSubtotal: line.lineSubtotal,
  });
}
export function toOrderResponse(order: Order): OrderResponse {
  return Object.freeze({
    id: order.id,
    status: 'DRAFT',
    currencyCode: order.currencyCode,
    lines: Object.freeze(order.lines.map(toOrderLineResponse)),
    subtotal: order.subtotal,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
}
