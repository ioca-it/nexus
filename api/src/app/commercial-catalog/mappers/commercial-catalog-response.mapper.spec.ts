import {
  createCatalogCustomerId,
  createCatalogItem,
  createCatalogPriceId,
  createCatalogProduct,
  createCatalogProductId,
  createCatalogProductNumber,
  createCustomerPrice,
} from '@nexus/modules/commercial-catalog';

import {
  toCatalogItemResponse,
  toCatalogProductResponse,
  toCustomerPriceResponse,
} from './commercial-catalog-response.mapper';

function createModels() {
  const product = createCatalogProduct({
    id: createCatalogProductId('product-1'),
    number: createCatalogProductNumber('P-001'),
    name: 'Product one',
    description: 'Description',
    categoryId: 'category-1',
    imageReference: 'image-1',
    unitOfMeasureCode: 'EA',
    active: true,
  });
  const price = createCustomerPrice({
    id: createCatalogPriceId('price-1'),
    customerId: createCatalogCustomerId('customer-1'),
    productId: product.id,
    currencyCode: 'USD',
    unitPrice: 12.5,
    minimumQuantity: 2,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validTo: new Date('2026-12-31T23:59:59.000Z'),
    active: true,
  });

  return { product, price, item: createCatalogItem(product, price) };
}

describe('Commercial Catalog response mappers', () => {
  it('maps only approved product response fields', () => {
    const { product } = createModels();

    const response = toCatalogProductResponse(product);

    expect(response).toEqual({
      id: 'product-1',
      number: 'P-001',
      name: 'Product one',
      description: 'Description',
      categoryId: 'category-1',
      imageReference: 'image-1',
      unitOfMeasureCode: 'EA',
    });
    expect(response).not.toHaveProperty('active');
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('maps only approved price fields and converts dates to ISO', () => {
    const { price } = createModels();
    const validFrom = price.validFrom?.getTime();

    const response = toCustomerPriceResponse(price);

    expect(response).toEqual({
      currencyCode: 'USD',
      unitPrice: 12.5,
      minimumQuantity: 2,
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-12-31T23:59:59.000Z',
    });
    expect(response).not.toHaveProperty('id');
    expect(response).not.toHaveProperty('customerId');
    expect(response).not.toHaveProperty('productId');
    expect(response).not.toHaveProperty('active');
    expect(price.validFrom?.getTime()).toBe(validFrom);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('deeply freezes an item response without modifying its input', () => {
    const { item } = createModels();
    const productReference = item.product;
    const priceReference = item.price;

    const response = toCatalogItemResponse(item);

    expect(response).toEqual({
      product: {
        id: 'product-1',
        number: 'P-001',
        name: 'Product one',
        description: 'Description',
        categoryId: 'category-1',
        imageReference: 'image-1',
        unitOfMeasureCode: 'EA',
      },
      price: {
        currencyCode: 'USD',
        unitPrice: 12.5,
        minimumQuantity: 2,
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2026-12-31T23:59:59.000Z',
      },
    });
    expect(Object.isFrozen(response)).toBe(true);
    expect(Object.isFrozen(response.product)).toBe(true);
    expect(Object.isFrozen(response.price)).toBe(true);
    expect(item.product).toBe(productReference);
    expect(item.price).toBe(priceReference);
    expect(JSON.stringify(response)).not.toMatch(
      /customerId|productId|active|inventory|availableQuantity/i,
    );
  });

  it('preserves absent optional fields without inventing them', () => {
    const product = createCatalogProduct({
      id: createCatalogProductId('product-1'),
      number: createCatalogProductNumber('P-001'),
      name: 'Product one',
      active: true,
    });
    const price = createCustomerPrice({
      id: createCatalogPriceId('price-1'),
      customerId: createCatalogCustomerId('customer-1'),
      productId: product.id,
      currencyCode: 'USD',
      unitPrice: 0,
      active: true,
    });
    const response = toCatalogItemResponse(createCatalogItem(product, price));

    expect(response.product).not.toHaveProperty('description');
    expect(response.price).not.toHaveProperty('minimumQuantity');
    expect(response.price).not.toHaveProperty('validFrom');
    expect(response.price).not.toHaveProperty('validTo');
  });
});
