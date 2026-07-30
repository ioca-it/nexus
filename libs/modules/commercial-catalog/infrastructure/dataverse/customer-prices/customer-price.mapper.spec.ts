import { toCustomerPrice } from './customer-price.mapper';

describe('toCustomerPrice', () => {
  it('maps through the domain factory and converts dates defensively', () => {
    const record = Object.freeze({
      id: ' price-1 ',
      customerId: ' customer-1 ',
      productId: ' product-1 ',
      currencyCode: ' USD ',
      unitPrice: 10,
      minimumQuantity: 2,
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-12-31T00:00:00.000Z',
      active: true,
    });
    const snapshot = { ...record };

    const result = toCustomerPrice(record);

    expect(result).toEqual({
      id: 'price-1',
      customerId: 'customer-1',
      productId: 'product-1',
      currencyCode: 'USD',
      unitPrice: 10,
      minimumQuantity: 2,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validTo: new Date('2026-12-31T00:00:00.000Z'),
      active: true,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.validFrom)).toBe(true);
    expect(record).toEqual(snapshot);
  });

  it('preserves absent optional values without inference', () => {
    const result = toCustomerPrice({
      id: 'price-1',
      customerId: 'customer-1',
      productId: 'product-1',
      currencyCode: 'USD',
      unitPrice: 0,
      active: true,
    });

    expect(result).not.toHaveProperty('minimumQuantity');
    expect(result).not.toHaveProperty('validFrom');
    expect(result).not.toHaveProperty('validTo');
  });

  it('preserves domain price validation', () => {
    expect(() =>
      toCustomerPrice({
        id: 'price-1',
        customerId: 'customer-1',
        productId: 'product-1',
        currencyCode: 'USD',
        unitPrice: -1,
        active: true,
      }),
    ).toThrow();
  });
});
