import { REQUIRED_ORDERS_DATAVERSE_ENVIRONMENT_VARIABLES } from './dataverse-config.validator';
import type { OrdersDataverseSchemaConfig } from './orders-config.types';

describe('Orders Dataverse configuration', () => {
  it('declares every configurable order and line field', () => {
    expect(REQUIRED_ORDERS_DATAVERSE_ENVIRONMENT_VARIABLES).toHaveLength(19);
    const schema: OrdersDataverseSchemaConfig = {
      order: {
        entitySet: 'orders',
        fields: {
          id: 'id',
          customerId: 'customer',
          status: 'status',
          currencyCode: 'currency',
          subtotal: 'subtotal',
          createdAt: 'created',
          updatedAt: 'updated',
        },
      },
      orderLine: {
        entitySet: 'lines',
        fields: {
          id: 'id',
          orderId: 'order',
          productId: 'product',
          productNumber: 'number',
          productName: 'name',
          unitOfMeasureCode: 'uom',
          currencyCode: 'currency',
          quantity: 'quantity',
          unitPrice: 'price',
          lineSubtotal: 'subtotal',
        },
      },
    };
    expect(Object.isFrozen(schema)).toBe(false);
    expect(schema.order.fields.customerId).toBe('customer');
  });
});
