import type { OrderLineRecord, OrderRecord } from './orders-dataverse.types';

export function validateOrderRecord(record: OrderRecord): OrderRecord {
  if (!record || typeof record !== 'object')
    throw new Error('Order record is required');
  for (const field of [
    'id',
    'customerId',
    'status',
    'currencyCode',
    'createdAt',
    'updatedAt',
  ] as const) {
    if (typeof record[field] !== 'string' || record[field].trim() === '')
      throw new Error(`Order record ${field} is invalid`);
  }
  if (!Number.isFinite(record.subtotal) || record.subtotal < 0)
    throw new Error('Order record subtotal is invalid');
  return Object.freeze({ ...record });
}

export function validateOrderLineRecord(
  record: OrderLineRecord,
): OrderLineRecord {
  if (!record || typeof record !== 'object')
    throw new Error('Order line record is required');
  for (const field of [
    'id',
    'orderId',
    'productId',
    'productNumber',
    'productName',
    'currencyCode',
  ] as const) {
    if (typeof record[field] !== 'string' || record[field].trim() === '')
      throw new Error(`Order line record ${field} is invalid`);
  }
  if (
    record.unitOfMeasureCode !== undefined &&
    (typeof record.unitOfMeasureCode !== 'string' ||
      record.unitOfMeasureCode.trim() === '')
  )
    throw new Error('Order line record unitOfMeasureCode is invalid');
  for (const field of ['quantity', 'unitPrice', 'lineSubtotal'] as const)
    if (
      !Number.isFinite(record[field]) ||
      record[field] < 0 ||
      (field === 'quantity' && record[field] <= 0)
    )
      throw new Error(`Order line record ${field} is invalid`);
  return Object.freeze({ ...record });
}
