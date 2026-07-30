import { toCatalogProduct } from './catalog-product.mapper';

describe('toCatalogProduct', () => {
  it('maps a record through the domain factory and preserves optionals', () => {
    const record = Object.freeze({
      id: ' product-1 ',
      number: ' P-001 ',
      name: ' Product one ',
      description: ' Description ',
      categoryId: ' Category ',
      imageReference: ' Image ',
      unitOfMeasureCode: ' EA ',
      ecommerceUrl: ' https://shop.example.test/products/P-001 ',
      active: true,
    });
    const snapshot = { ...record };

    const result = toCatalogProduct(record);

    expect(result).toEqual({
      id: 'product-1',
      number: 'P-001',
      name: 'Product one',
      description: 'Description',
      categoryId: 'Category',
      imageReference: 'Image',
      unitOfMeasureCode: 'EA',
      ecommerceUrl: 'https://shop.example.test/products/P-001',
      active: true,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(record).toEqual(snapshot);
  });

  it('does not add price or inventory data', () => {
    const result = toCatalogProduct({
      id: 'product-1',
      number: 'P-001',
      name: 'Product one',
      active: true,
    });

    expect(result).not.toHaveProperty('price');
    expect(result).not.toHaveProperty('inventory');
  });

  it('preserves domain validation', () => {
    expect(() =>
      toCatalogProduct({
        id: 'product-1',
        number: 'P-001',
        name: '   ',
        active: true,
      }),
    ).toThrow();
  });
});
