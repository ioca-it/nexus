import { roundOrderAmount } from './order-money';
import {
  createOrderLineId,
  createOrderProductId,
  createOrderProductNumber,
  type OrderLineId,
  type OrderProductId,
  type OrderProductNumber,
} from './order.types';

export interface OrderLine {
  readonly id: OrderLineId;
  readonly productId: OrderProductId;
  readonly productNumber: OrderProductNumber;
  readonly productName: string;
  readonly quantity: number;
  readonly unitOfMeasureCode?: string;
  readonly currencyCode: string;
  readonly unitPrice: number;
  readonly lineSubtotal: number;
}

export interface CreateOrderLineInput {
  readonly id: OrderLineId;
  readonly productId: OrderProductId;
  readonly productNumber: OrderProductNumber;
  readonly productName: string;
  readonly quantity: number;
  readonly unitOfMeasureCode?: string;
  readonly currencyCode: string;
  readonly unitPrice: number;
}

function requiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function optionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error('Order line unitOfMeasureCode must not be empty');
  }

  return normalized;
}

function positiveFinite(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive finite number`);
  }

  return value;
}

function finiteNonNegative(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a finite non-negative number`);
  }

  return value;
}

export function createOrderLine(input: CreateOrderLineInput): OrderLine {
  const quantity = positiveFinite(input.quantity, 'Order line quantity');
  const unitPrice = finiteNonNegative(input.unitPrice, 'Order line unitPrice');
  const unitOfMeasureCode = optionalString(input.unitOfMeasureCode);

  return Object.freeze({
    id: createOrderLineId(input.id),
    productId: createOrderProductId(input.productId),
    productNumber: createOrderProductNumber(input.productNumber),
    productName: requiredString(input.productName, 'Order line productName'),
    quantity,
    ...(unitOfMeasureCode === undefined ? {} : { unitOfMeasureCode }),
    currencyCode: requiredString(input.currencyCode, 'Order line currencyCode'),
    unitPrice,
    lineSubtotal: roundOrderAmount(quantity * unitPrice, 'Order line subtotal'),
  });
}
