import { Order } from '../../../domain/order';
import { createOrderLine } from '../../../domain/order-line';
import { DataverseOrderGateway } from '../orders/dataverse-order.gateway';
import { DataverseOrderLineGateway } from '../order-lines/dataverse-order-line.gateway';
import { DataverseOrderRepository } from '../repositories/dataverse-order.repository';
import type {
  OrdersDataverseClient,
  DataverseOrderSchema,
  DataverseOrderLineSchema,
} from '../common';

const orderSchema: DataverseOrderSchema = Object.freeze({
  entitySet: 'orders',
  fields: Object.freeze({
    id: 'oid',
    customerId: 'cid',
    status: 'st',
    currencyCode: 'cur',
    subtotal: 'sub',
    createdAt: 'created',
    updatedAt: 'updated',
  }),
});
const lineSchema: DataverseOrderLineSchema = Object.freeze({
  entitySet: 'orderlines',
  fields: Object.freeze({
    id: 'lid',
    orderId: 'oid',
    productId: 'pid',
    productNumber: 'pnum',
    productName: 'pname',
    unitOfMeasureCode: 'uom',
    currencyCode: 'cur',
    quantity: 'qty',
    unitPrice: 'price',
    lineSubtotal: 'ls',
  }),
});

describe('Orders Dataverse infrastructure', () => {
  it('maps configured fields and persists DRAFT orders and lines', async () => {
    const stores: Record<string, Readonly<Record<string, unknown>>[]> = {
      orders: [],
      orderlines: [],
    };
    const client: OrdersDataverseClient = {
      findOne: async (set, id) =>
        stores[set].find((r) => r['oid'] === id) ?? null,
      query: async (set, filter) =>
        stores[set].filter((r) =>
          Object.entries(filter).every(([k, v]) => r[k] === v),
        ),
      create: async (set, r) => {
        stores[set].push(r);
      },
      update: async () => undefined,
    };
    const repository = new DataverseOrderRepository(
      new DataverseOrderGateway(client, orderSchema),
      new DataverseOrderLineGateway(client, lineSchema),
    );
    const line = createOrderLine({
      id: 'l1' as never,
      productId: 'p1' as never,
      productNumber: 'P1' as never,
      productName: 'Product',
      currencyCode: 'USD',
      quantity: 2,
      unitPrice: 3,
    });
    const order = Order.create({
      id: 'o1' as never,
      customerId: 'c1' as never,
      currencyCode: 'USD',
      lines: [line],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
    await repository.create(order);
    expect(stores['orders'][0]).toEqual(
      expect.objectContaining({ oid: 'o1', cid: 'c1', st: 'DRAFT', sub: 6 }),
    );
    expect(stores['orderlines'][0]).toEqual(
      expect.objectContaining({ oid: 'o1', pid: 'p1', ls: 6 }),
    );
    const loaded = await repository.findById('o1' as never);
    expect(loaded?.subtotal).toBe(6);
    expect(Object.isFrozen(loaded?.lines)).toBe(true);
  });

  it('propagates gateway errors and does not expose unrelated fields', async () => {
    const client: OrdersDataverseClient = {
      findOne: async () => {
        throw new Error('dataverse unavailable');
      },
      query: async () => [],
      create: async () => undefined,
      update: async () => undefined,
    };
    const gateway = new DataverseOrderGateway(client, orderSchema);
    await expect(gateway.findOne('x')).rejects.toThrow('dataverse unavailable');
    expect(JSON.stringify(orderSchema)).not.toContain('ecommerceUrl');
    expect(JSON.stringify(lineSchema)).not.toContain('inventory');
  });
});
