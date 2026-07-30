import {
  createCatalogCustomerId,
  createCatalogProductId,
} from '../../../domain';
import type { CustomerPriceGateway } from './customer-price.gateway';
import { DataverseCustomerPriceRepository } from './customer-price.repository';

const record = Object.freeze({
  id: 'price-1',
  customerId: 'customer-1',
  productId: 'product-1',
  currencyCode: 'USD',
  unitPrice: 10,
  validFrom: '2026-01-01T00:00:00.000Z',
  active: true,
});
const customerId = createCatalogCustomerId('customer-1');
const productId = createCatalogProductId('product-1');
const asOf = new Date('2026-07-29T12:00:00.000Z');

function setup() {
  const gateway: jest.Mocked<CustomerPriceGateway> = {
    findActiveByCustomerId: jest.fn().mockResolvedValue([record]),
    findActiveByCustomerAndProduct: jest.fn().mockResolvedValue(record),
  };

  return {
    gateway,
    repository: new DataverseCustomerPriceRepository(gateway),
  };
}

describe('DataverseCustomerPriceRepository', () => {
  it('delegates the customer list once and freezes mapped results', async () => {
    const { gateway, repository } = setup();

    const result = await repository.findActiveByCustomerId(customerId, asOf);

    expect(gateway.findActiveByCustomerId).toHaveBeenCalledTimes(1);
    expect(gateway.findActiveByCustomerId).toHaveBeenCalledWith(
      customerId,
      asOf,
    );
    expect(result[0]?.validFrom).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('delegates customer and product once without recalculating validity', async () => {
    const { gateway, repository } = setup();

    const result = await repository.findActiveByCustomerAndProduct(
      customerId,
      productId,
      asOf,
    );

    expect(gateway.findActiveByCustomerAndProduct).toHaveBeenCalledTimes(1);
    expect(gateway.findActiveByCustomerAndProduct).toHaveBeenCalledWith(
      customerId,
      productId,
      asOf,
    );
    expect(result?.id).toBe('price-1');
  });

  it('returns null from the single-record lookup', async () => {
    const { gateway, repository } = setup();
    gateway.findActiveByCustomerAndProduct.mockResolvedValue(null);

    await expect(
      repository.findActiveByCustomerAndProduct(customerId, productId, asOf),
    ).resolves.toBeNull();
  });

  it('propagates gateway errors unchanged', async () => {
    const { gateway, repository } = setup();
    const failure = new Error('gateway failed');
    gateway.findActiveByCustomerId.mockRejectedValue(failure);

    await expect(
      repository.findActiveByCustomerId(customerId, asOf),
    ).rejects.toBe(failure);
  });
});
