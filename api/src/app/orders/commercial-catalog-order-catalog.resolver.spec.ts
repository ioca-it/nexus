import type { AuthenticatedActor } from '@nexus/platform';
import type { GetCustomerCatalogItemUseCase } from '@nexus/modules/commercial-catalog';
import { CommercialCatalogOrderCatalogResolver } from './commercial-catalog-order-catalog.resolver';

describe('CommercialCatalogOrderCatalogResolver', () => {
  const actor = {
    customerId: 'customer-1',
    permissions: [],
  } as unknown as AuthenticatedActor;

  it('maps only the authorized product and price snapshot', async () => {
    const execute = jest.fn().mockResolvedValue({
      product: {
        id: 'product-1',
        number: 'P-1',
        name: 'Product',
        unitOfMeasureCode: 'EA',
        ecommerceUrl: 'https://example.test',
        imageReference: 'image',
      },
      price: {
        currencyCode: 'USD',
        unitPrice: 12,
        id: 'price-1',
        productId: 'product-1',
        validFrom: new Date(),
        active: true,
      },
    });
    const resolver = new CommercialCatalogOrderCatalogResolver({
      execute,
    } as unknown as GetCustomerCatalogItemUseCase);
    const result = await resolver.resolveForCustomer(
      actor,
      'product-1' as never,
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0].actor).toBe(actor);
    expect(result).toEqual({
      productId: 'product-1',
      productNumber: 'P-1',
      productName: 'Product',
      unitOfMeasureCode: 'EA',
      currencyCode: 'USD',
      unitPrice: 12,
    });
    expect(result).not.toHaveProperty('ecommerceUrl');
    expect(result).not.toHaveProperty('imageReference');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns null and propagates errors', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('catalog failed'));
    const resolver = new CommercialCatalogOrderCatalogResolver({
      execute,
    } as unknown as GetCustomerCatalogItemUseCase);
    await expect(
      resolver.resolveForCustomer(actor, 'p1' as never),
    ).resolves.toBeNull();
    await expect(
      resolver.resolveForCustomer(actor, 'p1' as never),
    ).rejects.toThrow('catalog failed');
  });
});
