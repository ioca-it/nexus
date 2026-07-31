import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createOrderCustomerId,
  createOrderId,
  createOrderLineId,
  createOrderProductId,
  createOrderProductNumber,
} from './order.types';
import { createOrderLine, type CreateOrderLineInput } from './order-line';
import { ORDER_STATUS } from './order-status';
import { Order } from './order';

const ids = Object.freeze({
  order: createOrderId('order-1'),
  customer: createOrderCustomerId('customer-1'),
  line: createOrderLineId('line-1'),
  product: createOrderProductId('product-1'),
  productNumber: createOrderProductNumber('SKU-1'),
});

function line(
  overrides: Partial<CreateOrderLineInput> = {},
): ReturnType<typeof createOrderLine> {
  return createOrderLine({
    id: ids.line,
    productId: ids.product,
    productNumber: ids.productNumber,
    productName: ' Product One ',
    quantity: 3,
    unitOfMeasureCode: ' EA ',
    currencyCode: ' USD ',
    unitPrice: 2.335,
    ...overrides,
  });
}

function order(
  overrides: Partial<Parameters<typeof Order.create>[0]> = {},
): Order {
  return Order.create({
    id: ids.order,
    customerId: ids.customer,
    currencyCode: 'USD',
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    ...overrides,
  });
}

describe('OrderLine', () => {
  it('creates a trimmed immutable authorized-price snapshot', () => {
    const input = {
      id: ids.line,
      productId: ids.product,
      productNumber: ids.productNumber,
      productName: ' Product One ',
      quantity: 2,
      unitOfMeasureCode: ' EA ',
      currencyCode: ' USD ',
      unitPrice: 5,
    } as const;
    const result = createOrderLine(input);

    expect(result).toEqual({
      id: 'line-1',
      productId: 'product-1',
      productNumber: 'SKU-1',
      productName: 'Product One',
      quantity: 2,
      unitOfMeasureCode: 'EA',
      currencyCode: 'USD',
      unitPrice: 5,
      lineSubtotal: 10,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(input.productName).toBe(' Product One ');
  });

  it('calculates and rounds subtotal internally to two decimals', () => {
    expect(line().lineSubtotal).toBe(7.01);
    expect(line({ quantity: 3, unitPrice: 0.1 }).lineSubtotal).toBe(0.3);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid quantity %p',
    (quantity) => {
      expect(() => line({ quantity })).toThrow(
        'Order line quantity must be a positive finite number',
      );
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid unitPrice %p',
    (unitPrice) => {
      expect(() => line({ unitPrice })).toThrow(
        'Order line unitPrice must be a finite non-negative number',
      );
    },
  );

  it.each([
    ['id', { id: ' ' as typeof ids.line }],
    ['productId', { productId: ' ' as typeof ids.product }],
    ['productNumber', { productNumber: ' ' as typeof ids.productNumber }],
    ['productName', { productName: ' ' }],
    ['currencyCode', { currencyCode: ' ' }],
  ])('rejects empty required %s', (_field, overrides) => {
    expect(() => line(overrides)).toThrow(/required/);
  });

  it('does not accept an externally supplied subtotal or forbidden fields', () => {
    const result = createOrderLine({
      id: ids.line,
      productId: ids.product,
      productNumber: ids.productNumber,
      productName: 'Product',
      quantity: 2,
      currencyCode: 'USD',
      unitPrice: 4,
      lineSubtotal: 999,
      inventory: 10,
      tax: 5,
      discount: 2,
    } as CreateOrderLineInput & Record<string, unknown>);

    expect(result.lineSubtotal).toBe(8);
    expect(result).not.toHaveProperty('inventory');
    expect(result).not.toHaveProperty('tax');
    expect(result).not.toHaveProperty('discount');
  });

  it('rejects a multiplication that overflows a finite subtotal', () => {
    expect(() =>
      line({ quantity: Number.MAX_VALUE, unitPrice: Number.MAX_VALUE }),
    ).toThrow('Order line subtotal must be a finite amount');
  });
});

describe('Order', () => {
  it('creates an empty DRAFT with zero subtotal', () => {
    const result = order();

    expect(result.status).toBe(ORDER_STATUS.DRAFT);
    expect(result.lines).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.lines)).toBe(true);
  });

  it('requires customerId and currencyCode', () => {
    expect(() => order({ customerId: ' ' as typeof ids.customer })).toThrow(
      'Order customer id is required',
    );
    expect(() => order({ currencyCode: ' ' })).toThrow(
      'Order currencyCode is required',
    );
  });

  it('copies dates defensively on input and output', () => {
    const createdAt = new Date('2026-07-30T10:00:00.000Z');
    const updatedAt = new Date('2026-07-30T11:00:00.000Z');
    const result = order({ createdAt, updatedAt });

    createdAt.setUTCFullYear(2030);
    updatedAt.setUTCFullYear(2030);
    const exposedCreatedAt = result.createdAt;
    const exposedUpdatedAt = result.updatedAt;
    exposedCreatedAt.setUTCFullYear(2040);
    exposedUpdatedAt.setUTCFullYear(2040);

    expect(result.createdAt.toISOString()).toBe('2026-07-30T10:00:00.000Z');
    expect(result.updatedAt.toISOString()).toBe('2026-07-30T11:00:00.000Z');
  });

  it('rejects invalid dates and updatedAt before createdAt', () => {
    expect(() => order({ createdAt: new Date('invalid') })).toThrow(
      'Order createdAt must be a valid date',
    );
    expect(() => order({ updatedAt: new Date('invalid') })).toThrow(
      'Order updatedAt must be a valid date',
    );
    expect(() =>
      order({ updatedAt: new Date('2026-07-30T09:59:59.999Z') }),
    ).toThrow('Order updatedAt cannot precede createdAt');
  });

  it('copies and freezes lines without modifying the input array', () => {
    const orderLine = line({ unitPrice: 2 });
    const inputLines = [orderLine];
    const result = order({ lines: inputLines });

    inputLines.length = 0;

    expect(result.lines).toEqual([orderLine]);
    expect(result.lines).not.toBe(inputLines);
    expect(result.lines[0]).not.toBe(orderLine);
    expect(Object.isFrozen(result.lines)).toBe(true);
    expect(Object.isFrozen(result.lines[0])).toBe(true);
  });

  it('rejects a line using a different currency', () => {
    expect(() =>
      order({ currencyCode: 'USD', lines: [line({ currencyCode: 'EUR' })] }),
    ).toThrow('Order lines must use the order currencyCode');
  });

  it('replaceLines recalculates subtotal and preserves identity', () => {
    const original = order();
    const updated = original.replaceLines(
      [
        line({ quantity: 2, unitPrice: 1.115 }),
        line({
          id: createOrderLineId('line-2'),
          productId: createOrderProductId('product-2'),
          productNumber: createOrderProductNumber('SKU-2'),
          quantity: 1,
          unitPrice: 3,
        }),
      ],
      new Date('2026-07-30T12:00:00.000Z'),
    );

    expect(updated).not.toBe(original);
    expect(updated.subtotal).toBe(5.23);
    expect(updated.id).toBe(original.id);
    expect(updated.customerId).toBe(original.customerId);
    expect(updated.status).toBe(original.status);
    expect(updated.createdAt.getTime()).toBe(original.createdAt.getTime());
    expect(updated.updatedAt.toISOString()).toBe('2026-07-30T12:00:00.000Z');
  });

  it('replaceLines leaves the original intact and rejects invalid changes', () => {
    const original = order({ lines: [line()] });

    expect(() =>
      original.replaceLines(
        [line({ currencyCode: 'EUR' })],
        new Date('2026-07-30T11:00:00.000Z'),
      ),
    ).toThrow('Order lines must use the order currencyCode');
    expect(() =>
      original.replaceLines([], new Date('2026-07-30T09:00:00.000Z')),
    ).toThrow('Order updatedAt cannot precede createdAt');
    expect(original.lines).toHaveLength(1);
    expect(original.subtotal).toBe(7.01);
  });

  it('defines exactly the approved statuses and transition operation', () => {
    const statusSource = readFileSync(
      join(__dirname, 'order-status.ts'),
      'utf8',
    );
    const orderSource = readFileSync(join(__dirname, 'order.ts'), 'utf8');

    expect(ORDER_STATUS).toEqual({
      DRAFT: 'DRAFT',
      SUBMITTED: 'SUBMITTED',
      UNDER_REVIEW: 'UNDER_REVIEW',
      CHANGES_REQUESTED: 'CHANGES_REQUESTED',
      REJECTED: 'REJECTED',
      APPROVED: 'APPROVED',
    });
    expect(statusSource).not.toMatch(/CONFIRMED|PROCESSING|SHIPPED|CANCELLED/);
    expect(orderSource).toMatch(/transitionTo/);
    expect(order()).toHaveProperty('transitionTo');
  });

  it('transitions immutably without changing the commercial snapshot', () => {
    const original = order();
    const transitioned = original.transitionTo(
      ORDER_STATUS.SUBMITTED,
      new Date('2026-07-30T11:00:00.000Z'),
    );
    expect(transitioned.status).toBe(ORDER_STATUS.SUBMITTED);
    expect(transitioned.lines).toEqual(original.lines);
    expect(transitioned.subtotal).toBe(original.subtotal);
    expect(original.status).toBe(ORDER_STATUS.DRAFT);
    expect(Object.isFrozen(transitioned)).toBe(true);
  });

  it('does not accept subtotal or non-approved concerns in create input', () => {
    const result = Order.create({
      id: ids.order,
      customerId: ids.customer,
      currencyCode: 'USD',
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      updatedAt: new Date('2026-07-30T10:00:00.000Z'),
      subtotal: 999,
      inventory: 10,
      tax: 2,
      shipping: 4,
    } as Parameters<typeof Order.create>[0] & Record<string, unknown>);

    expect(result.subtotal).toBe(0);
    expect(result).not.toHaveProperty('inventory');
    expect(result).not.toHaveProperty('tax');
    expect(result).not.toHaveProperty('shipping');
  });
});
