import {
  createCatalogCustomerId,
  createCatalogItem,
  createCatalogPriceId,
  createCatalogProduct,
  createCatalogProductId,
  createCatalogProductNumber,
  createCustomerPrice,
} from './index';

function productInput() {
  return Object.freeze({
    id: createCatalogProductId(' product-1 '),
    number: createCatalogProductNumber(' P-001 '),
    name: ' Product one ',
    description: ' Description ',
    categoryId: ' Category ',
    imageReference: ' Image ',
    unitOfMeasureCode: ' EA ',
    active: true,
  });
}

function priceInput() {
  return Object.freeze({
    id: createCatalogPriceId(' price-1 '),
    customerId: createCatalogCustomerId(' customer-1 '),
    productId: createCatalogProductId(' product-1 '),
    currencyCode: ' USD ',
    unitPrice: 12.5,
    minimumQuantity: 2,
    validFrom: new Date('2026-07-01T00:00:00.000Z'),
    validTo: new Date('2026-12-31T00:00:00.000Z'),
    active: true,
  });
}

describe('Commercial Catalog domain', () => {
  it('creates a normalized frozen product and preserves optionals', () => {
    const product = createCatalogProduct(productInput());

    expect(product).toEqual({
      id: 'product-1',
      number: 'P-001',
      name: 'Product one',
      description: 'Description',
      categoryId: 'Category',
      imageReference: 'Image',
      unitOfMeasureCode: 'EA',
      active: true,
    });
    expect(Object.isFrozen(product)).toBe(true);
    expect(product).not.toHaveProperty('price');
    expect(product).not.toHaveProperty('inventory');
  });

  it.each([
    ['id', () => createCatalogProductId('   ')],
    ['number', () => createCatalogProductNumber('')],
    ['name', () => createCatalogProduct({ ...productInput(), name: '  ' })],
  ])('rejects an empty required product %s', (_field, action) => {
    expect(action).toThrow();
  });

  it('rejects a non-boolean product active value', () => {
    expect(() =>
      createCatalogProduct({
        ...productInput(),
        active: 'true' as unknown as boolean,
      }),
    ).toThrow();
  });

  it('creates a normalized frozen customer price', () => {
    const price = createCustomerPrice(priceInput());

    expect(price).toEqual({
      id: 'price-1',
      customerId: 'customer-1',
      productId: 'product-1',
      currencyCode: 'USD',
      unitPrice: 12.5,
      minimumQuantity: 2,
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      validTo: new Date('2026-12-31T00:00:00.000Z'),
      active: true,
    });
    expect(Object.isFrozen(price)).toBe(true);
    expect(Object.isFrozen(price.validFrom)).toBe(true);
    expect(Object.isFrozen(price.validTo)).toBe(true);
  });

  it.each([Number.NaN, Infinity, Number.NEGATIVE_INFINITY, -1])(
    'rejects an invalid unit price: %s',
    (unitPrice) => {
      expect(() =>
        createCustomerPrice({ ...priceInput(), unitPrice }),
      ).toThrow();
    },
  );

  it.each([0, -1, Number.NaN, Infinity])(
    'rejects an invalid minimum quantity: %s',
    (minimumQuantity) => {
      expect(() =>
        createCustomerPrice({ ...priceInput(), minimumQuantity }),
      ).toThrow();
    },
  );

  it('rejects invalid dates and reversed validity ranges', () => {
    expect(() =>
      createCustomerPrice({
        ...priceInput(),
        validFrom: new Date(Number.NaN),
      }),
    ).toThrow();
    expect(() =>
      createCustomerPrice({
        ...priceInput(),
        validFrom: new Date('2026-08-01T00:00:00Z'),
        validTo: new Date('2026-07-01T00:00:00Z'),
      }),
    ).toThrow();
  });

  it('copies dates defensively without modifying the input', () => {
    const input = priceInput();
    const price = createCustomerPrice(input);

    expect(price.validFrom).not.toBe(input.validFrom);
    expect(price.validTo).not.toBe(input.validTo);
    expect(input.validFrom.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('does not invent absent price optionals', () => {
    const price = createCustomerPrice({
      id: createCatalogPriceId('price-1'),
      customerId: createCatalogCustomerId('customer-1'),
      productId: createCatalogProductId('product-1'),
      currencyCode: 'USD',
      unitPrice: 0,
      active: true,
    });

    expect(price).not.toHaveProperty('minimumQuantity');
    expect(price).not.toHaveProperty('validFrom');
    expect(price).not.toHaveProperty('validTo');
    expect(price).not.toHaveProperty('inventory');
  });

  it('requires a matching product id and freezes the catalog item', () => {
    const product = createCatalogProduct(productInput());
    const price = createCustomerPrice(priceInput());
    const item = createCatalogItem(product, price);

    expect(item).toEqual({ product, price });
    expect(Object.isFrozen(item)).toBe(true);
    expect(() =>
      createCatalogItem(
        product,
        createCustomerPrice({
          ...priceInput(),
          productId: createCatalogProductId('product-2'),
        }),
      ),
    ).toThrow();
  });
});
