import {
  createCatalogCustomerId,
  createCatalogProductId,
} from '../../../domain';
import type { CommercialCatalogDataverseClient } from '../common';
import { DataverseCustomerPriceGateway } from './dataverse-customer-price.gateway';

const schema = Object.freeze({
  entitySet: 'configured_prices',
  fields: Object.freeze({
    id: 'configured_id',
    customerId: 'configured_customer',
    productId: 'configured_product',
    currencyCode: 'configured_currency',
    unitPrice: 'configured_unit_price',
    minimumQuantity: 'configured_minimum_quantity',
    validFrom: 'configured_valid_from',
    validTo: 'configured_valid_to',
    active: 'configured_active',
  }),
});

const effectiveRecord = Object.freeze({
  configured_id: ' price-1 ',
  configured_customer: ' customer-1 ',
  configured_product: ' product-1 ',
  configured_currency: ' USD ',
  configured_unit_price: 12.5,
  configured_minimum_quantity: 2,
  configured_valid_from: '2026-01-01T00:00:00.000Z',
  configured_valid_to: '2026-12-31T23:59:59.000Z',
  configured_active: true,
});
const customerId = createCatalogCustomerId('customer-1');
const productId = createCatalogProductId('product-1');
const asOf = new Date('2026-07-29T12:00:00.000Z');

function setup(
  records: readonly Readonly<Record<string, unknown>>[] = [effectiveRecord],
) {
  const client: jest.Mocked<CommercialCatalogDataverseClient> = {
    findOne: jest.fn(),
    query: jest.fn().mockResolvedValue(records),
  };

  return {
    client,
    gateway: new DataverseCustomerPriceGateway({ client, schema }),
  };
}

describe('DataverseCustomerPriceGateway', () => {
  it('lists only effective active prices for the requested customer', async () => {
    const otherCustomer = Object.freeze({
      ...effectiveRecord,
      configured_id: 'other-price',
      configured_customer: 'customer-2',
    });
    const inactive = Object.freeze({
      ...effectiveRecord,
      configured_id: 'inactive-price',
      configured_active: false,
    });
    const { gateway } = setup([effectiveRecord, otherCustomer, inactive]);

    const result = await gateway.findActiveByCustomerId(customerId, asOf);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'price-1',
      customerId: 'customer-1',
      productId: 'product-1',
      currencyCode: 'USD',
      unitPrice: 12.5,
      minimumQuantity: 2,
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-12-31T23:59:59.000Z',
      active: true,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it('uses configured customer and active fields in one logical query', async () => {
    const { client, gateway } = setup();

    await gateway.findActiveByCustomerId(customerId, asOf);

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('configured_prices', {
      configured_customer: 'customer-1',
      configured_active: true,
    });
    expect(client.findOne).not.toHaveBeenCalled();
    expect(Object.isFrozen(client.query.mock.calls[0]?.[1])).toBe(true);
  });

  it('respects validFrom and validTo boundaries', async () => {
    const future = Object.freeze({
      ...effectiveRecord,
      configured_id: 'future',
      configured_valid_from: '2026-07-30T00:00:00.000Z',
    });
    const expired = Object.freeze({
      ...effectiveRecord,
      configured_id: 'expired',
      configured_valid_to: '2026-07-28T23:59:59.000Z',
    });
    const beginsNow = Object.freeze({
      ...effectiveRecord,
      configured_id: 'begins-now',
      configured_valid_from: asOf.toISOString(),
    });
    const endsNow = Object.freeze({
      ...effectiveRecord,
      configured_id: 'ends-now',
      configured_valid_to: asOf.toISOString(),
    });
    const { gateway } = setup([future, expired, beginsNow, endsNow]);

    const result = await gateway.findActiveByCustomerId(customerId, asOf);

    expect(result.map((price) => price.id)).toEqual(['begins-now', 'ends-now']);
  });

  it('keeps prices without validity limits and normalizes empty optionals', async () => {
    const unlimited = Object.freeze({
      ...effectiveRecord,
      configured_valid_from: '   ',
      configured_valid_to: undefined,
      configured_minimum_quantity: null,
    });
    const { gateway } = setup([unlimited]);

    const result = await gateway.findActiveByCustomerId(customerId, asOf);

    expect(result[0]).not.toHaveProperty('validFrom');
    expect(result[0]).not.toHaveProperty('validTo');
    expect(result[0]).not.toHaveProperty('minimumQuantity');
  });

  it('finds one price by configured customer and product filters', async () => {
    const { client, gateway } = setup();

    const result = await gateway.findActiveByCustomerAndProduct(
      customerId,
      productId,
      asOf,
    );

    expect(result?.id).toBe('price-1');
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('configured_prices', {
      configured_customer: 'customer-1',
      configured_product: 'product-1',
      configured_active: true,
    });
  });

  it('returns null when no effective price exists', async () => {
    const future = Object.freeze({
      ...effectiveRecord,
      configured_valid_from: '2027-01-01T00:00:00.000Z',
    });
    const { gateway } = setup([future]);

    await expect(
      gateway.findActiveByCustomerAndProduct(customerId, productId, asOf),
    ).resolves.toBeNull();
  });

  it('rejects duplicate effective prices instead of choosing one', async () => {
    const duplicate = Object.freeze({
      ...effectiveRecord,
      configured_id: 'price-2',
    });
    const { gateway } = setup([effectiveRecord, duplicate]);

    await expect(
      gateway.findActiveByCustomerAndProduct(customerId, productId, asOf),
    ).rejects.toThrow();
  });

  it('does not modify the asOf date or physical records', async () => {
    const records = Object.freeze([effectiveRecord]);
    const { gateway } = setup(records);
    const timestamp = asOf.getTime();
    const snapshot = { ...effectiveRecord };

    await gateway.findActiveByCustomerId(customerId, asOf);

    expect(asOf.getTime()).toBe(timestamp);
    expect(effectiveRecord).toEqual(snapshot);
    expect(records[0]).toBe(effectiveRecord);
  });

  it('rejects an invalid asOf before querying', async () => {
    const { client, gateway } = setup();

    await expect(
      gateway.findActiveByCustomerId(customerId, new Date(Number.NaN)),
    ).rejects.toThrow();
    expect(client.query).not.toHaveBeenCalled();
  });

  it.each([
    ['configured_unit_price', Number.NaN],
    ['configured_minimum_quantity', Infinity],
    ['configured_valid_from', '2026-02-30'],
    ['configured_valid_to', 'not-a-date'],
    ['configured_active', 'true'],
  ])('rejects invalid physical field %s', async (fieldName, value) => {
    const { gateway } = setup([
      Object.freeze({ ...effectiveRecord, [fieldName]: value }),
    ]);

    await expect(
      gateway.findActiveByCustomerId(customerId, asOf),
    ).rejects.toThrow(`"${fieldName}"`);
  });

  it('propagates client errors unchanged', async () => {
    const failure = new Error('Dataverse unavailable');
    const { client, gateway } = setup();
    client.query.mockRejectedValue(failure);

    await expect(gateway.findActiveByCustomerId(customerId, asOf)).rejects.toBe(
      failure,
    );
  });
});
