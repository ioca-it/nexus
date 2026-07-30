import { Order } from '@nexus/modules/orders';
import { toOrderResponse } from './order-response.mapper';

describe('Order response mapper', () => {
  it('maps frozen public fields only', () => {
    const order = Order.create({
      id: 'o1' as never,
      customerId: 'c1' as never,
      currencyCode: 'USD',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
    const result = toOrderResponse(order);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'o1',
        status: 'DRAFT',
        currencyCode: 'USD',
        subtotal: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    );
    expect(result).not.toHaveProperty('customerId');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.lines)).toBe(true);
  });
});
