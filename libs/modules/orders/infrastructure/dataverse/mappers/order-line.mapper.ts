import { createOrderLine } from '../../../domain/order-line';
import type { OrderLine } from '../../../domain/order-line';
import type { OrderLineRecord } from '../common/orders-dataverse.types';
import { validateOrderLineRecord } from '../common/orders-dataverse.validators';

export function toOrderLineRecord(
  line: OrderLine,
  orderId: string,
): OrderLineRecord {
  return Object.freeze({
    id: line.id,
    orderId,
    productId: line.productId,
    productNumber: line.productNumber,
    productName: line.productName,
    ...(line.unitOfMeasureCode === undefined
      ? {}
      : { unitOfMeasureCode: line.unitOfMeasureCode }),
    currencyCode: line.currencyCode,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineSubtotal: line.lineSubtotal,
  });
}

export function toOrderLine(record: OrderLineRecord): OrderLine {
  const value = validateOrderLineRecord(record);
  const line = createOrderLine({
    id: value.id as never,
    productId: value.productId as never,
    productNumber: value.productNumber as never,
    productName: value.productName,
    unitOfMeasureCode: value.unitOfMeasureCode,
    currencyCode: value.currencyCode,
    quantity: value.quantity,
    unitPrice: value.unitPrice,
  });
  if (line.lineSubtotal !== value.lineSubtotal)
    throw new Error('Order line subtotal is invalid');
  return line;
}
