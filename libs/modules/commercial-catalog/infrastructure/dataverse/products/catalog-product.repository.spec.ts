import { createCatalogProductId } from '../../../domain';
import type { CatalogProductGateway } from './catalog-product.gateway';
import { DataverseCatalogProductRepository } from './catalog-product.repository';

const record = Object.freeze({
  id: 'product-1',
  number: 'P-001',
  name: 'Product one',
  ecommerceUrl: 'https://shop.example.test/products/P-001',
  active: true,
});

function setup() {
  const gateway: jest.Mocked<CatalogProductGateway> = {
    findById: jest.fn().mockResolvedValue(record),
    findActive: jest.fn().mockResolvedValue([record]),
  };

  return {
    gateway,
    repository: new DataverseCatalogProductRepository(gateway),
  };
}

describe('DataverseCatalogProductRepository', () => {
  it('delegates findById once and maps the result', async () => {
    const { gateway, repository } = setup();
    const id = createCatalogProductId('product-1');

    const result = await repository.findById(id);

    expect(gateway.findById).toHaveBeenCalledTimes(1);
    expect(gateway.findById).toHaveBeenCalledWith(id);
    expect(result?.id).toBe(id);
    expect(result?.ecommerceUrl).toBe(
      'https://shop.example.test/products/P-001',
    );
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns null without additional work', async () => {
    const { gateway, repository } = setup();
    gateway.findById.mockResolvedValue(null);

    await expect(
      repository.findById(createCatalogProductId('missing')),
    ).resolves.toBeNull();
    expect(gateway.findById).toHaveBeenCalledTimes(1);
  });

  it('maps and freezes the active collection', async () => {
    const { gateway, repository } = setup();

    const result = await repository.findActive();

    expect(gateway.findActive).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]?.ecommerceUrl).toBe(
      'https://shop.example.test/products/P-001',
    );
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('propagates gateway errors unchanged', async () => {
    const { gateway, repository } = setup();
    const failure = new Error('gateway failed');
    gateway.findActive.mockRejectedValue(failure);

    await expect(repository.findActive()).rejects.toBe(failure);
  });
});
