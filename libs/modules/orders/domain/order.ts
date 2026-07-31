import type { OrderLine } from './order-line';
import { roundOrderAmount } from './order-money';
import { ORDER_STATUS, type OrderStatus } from './order-status';
import {
  createOrderCustomerId,
  createOrderId,
  type OrderCustomerId,
  type OrderId,
} from './order.types';

export interface CreateOrderInput {
  readonly id: OrderId;
  readonly customerId: OrderCustomerId;
  readonly currencyCode: string;
  readonly lines?: readonly OrderLine[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function requiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function copyDate(value: Date, fieldName: string): Date {
  const copy = new Date(value.getTime());

  if (!Number.isFinite(copy.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return copy;
}

function copyLines(
  lines: readonly OrderLine[],
  currencyCode: string,
): readonly OrderLine[] {
  const copiedLines = lines.map((line) => {
    if (line.currencyCode !== currencyCode) {
      throw new Error('Order lines must use the order currencyCode');
    }

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
  });

  return Object.freeze(copiedLines);
}

function calculateSubtotal(lines: readonly OrderLine[]): number {
  return roundOrderAmount(
    lines.reduce((subtotal, line) => subtotal + line.lineSubtotal, 0),
    'Order subtotal',
  );
}

export class Order {
  readonly id: OrderId;
  readonly customerId: OrderCustomerId;
  readonly status: OrderStatus;
  readonly currencyCode: string;
  readonly lines: readonly OrderLine[];
  readonly subtotal: number;
  private readonly createdAtValue: Date;
  private readonly updatedAtValue: Date;

  private constructor(input: {
    readonly id: OrderId;
    readonly customerId: OrderCustomerId;
    readonly status: OrderStatus;
    readonly currencyCode: string;
    readonly lines: readonly OrderLine[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }) {
    this.id = input.id;
    this.customerId = input.customerId;
    this.status = input.status;
    this.currencyCode = input.currencyCode;
    this.lines = input.lines;
    this.subtotal = calculateSubtotal(input.lines);
    this.createdAtValue = input.createdAt;
    this.updatedAtValue = input.updatedAt;
    Object.freeze(this);
  }

  get createdAt(): Date {
    return new Date(this.createdAtValue.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.updatedAtValue.getTime());
  }

  static create(input: CreateOrderInput): Order {
    const currencyCode = requiredString(
      input.currencyCode,
      'Order currencyCode',
    );
    const createdAt = copyDate(input.createdAt, 'Order createdAt');
    const updatedAt = copyDate(input.updatedAt, 'Order updatedAt');

    if (updatedAt.getTime() < createdAt.getTime()) {
      throw new Error('Order updatedAt cannot precede createdAt');
    }

    return new Order({
      id: createOrderId(input.id),
      customerId: createOrderCustomerId(input.customerId),
      status: ORDER_STATUS.DRAFT,
      currencyCode,
      lines: copyLines(input.lines ?? [], currencyCode),
      createdAt,
      updatedAt,
    });
  }

  replaceLines(lines: readonly OrderLine[], updatedAt: Date): Order {
    if (
      this.status !== ORDER_STATUS.DRAFT &&
      this.status !== ORDER_STATUS.CHANGES_REQUESTED
    ) {
      throw new Error('Order lines can only be replaced while editable');
    }

    const nextUpdatedAt = copyDate(updatedAt, 'Order updatedAt');

    if (nextUpdatedAt.getTime() < this.createdAtValue.getTime()) {
      throw new Error('Order updatedAt cannot precede createdAt');
    }

    return new Order({
      id: this.id,
      customerId: this.customerId,
      status: this.status,
      currencyCode: this.currencyCode,
      lines: copyLines(lines, this.currencyCode),
      createdAt: new Date(this.createdAtValue.getTime()),
      updatedAt: nextUpdatedAt,
    });
  }

  transitionTo(status: OrderStatus, updatedAt: Date): Order {
    const nextUpdatedAt = copyDate(updatedAt, 'Order updatedAt');
    if (nextUpdatedAt.getTime() < this.createdAtValue.getTime()) {
      throw new Error('Order updatedAt cannot precede createdAt');
    }
    return new Order({
      id: this.id,
      customerId: this.customerId,
      status,
      currencyCode: this.currencyCode,
      lines: copyLines(this.lines, this.currencyCode),
      createdAt: new Date(this.createdAtValue.getTime()),
      updatedAt: nextUpdatedAt,
    });
  }
}
