import type { AuthenticatedActor, Permission } from '@nexus/platform';
import {
  createCatalogCustomerId,
  createCatalogPriceId,
  createCatalogProduct,
  createCatalogProductId,
  createCatalogProductNumber,
  createCustomerPrice,
  type CatalogProductRepository,
  type CustomerPriceRepository,
} from '../../domain';
import {
  COMMERCIAL_CATALOG_PERMISSION_ACTIONS,
  COMMERCIAL_CATALOG_PERMISSION_MODULE,
} from '../security';
import { ListCustomerCatalogUseCase } from './list-customer-catalog.use-case';

const AS_OF = new Date('2026-07-29T12:00:00.000Z');

function actor(options?: {
  readonly customerId?: string | null;
  readonly permissions?: readonly Permission[];
}): AuthenticatedActor {
  const permissions: readonly Permission[] = options?.permissions ?? [
    {
      module: COMMERCIAL_CATALOG_PERMISSION_MODULE,
      action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_CATALOG,
      effect: 'allow',
    },
  ];

  return Object.freeze({
    userId: 'user-1',
    customerId:
      options !== undefined && 'customerId' in options
        ? (options.customerId ?? null)
        : 'customer-1',
    roles: Object.freeze([]),
    permissions: Object.freeze([...permissions]),
    approvalGroupIds: Object.freeze([]),
  });
}

function product(id: string, active = true) {
  return createCatalogProduct({
    id: createCatalogProductId(id),
    number: createCatalogProductNumber(`number-${id}`),
    name: `Product ${id}`,
    active,
  });
}

function price(productId: string, customerId = 'customer-1') {
  return createCustomerPrice({
    id: createCatalogPriceId(`price-${customerId}-${productId}`),
    customerId: createCatalogCustomerId(customerId),
    productId: createCatalogProductId(productId),
    currencyCode: 'USD',
    unitPrice: 10,
    active: true,
  });
}

function setup() {
  const productRepository: jest.Mocked<CatalogProductRepository> = {
    findById: jest.fn(),
    findActive: jest.fn(),
  };
  const customerPriceRepository: jest.Mocked<CustomerPriceRepository> = {
    findActiveByCustomerId: jest.fn(),
    findActiveByCustomerAndProduct: jest.fn(),
  };
  const clock = jest.fn(() => AS_OF);
  const useCase = new ListCustomerCatalogUseCase({
    productRepository,
    customerPriceRepository,
    clock,
  });

  return { productRepository, customerPriceRepository, clock, useCase };
}

describe('ListCustomerCatalogUseCase', () => {
  it('returns the customer catalog in product order with one call per dependency', async () => {
    const dependencies = setup();
    const first = product('product-1');
    const second = product('product-2');
    const request = Object.freeze({ actor: actor() });
    dependencies.productRepository.findActive.mockResolvedValue(
      Object.freeze([first, second]),
    );
    dependencies.customerPriceRepository.findActiveByCustomerId.mockResolvedValue(
      Object.freeze([price('product-2'), price('product-1')]),
    );

    const result = await dependencies.useCase.execute(request);

    expect(result.map((item) => item.product.id)).toEqual([
      'product-1',
      'product-2',
    ]);
    expect(dependencies.clock).toHaveBeenCalledTimes(1);
    expect(dependencies.productRepository.findActive).toHaveBeenCalledTimes(1);
    expect(
      dependencies.customerPriceRepository.findActiveByCustomerId,
    ).toHaveBeenCalledTimes(1);
    expect(
      dependencies.customerPriceRepository.findActiveByCustomerId,
    ).toHaveBeenCalledWith('customer-1', AS_OF);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
    expect(request.actor.customerId).toBe('customer-1');
  });

  it('denies missing permission before executing dependencies', async () => {
    const dependencies = setup();

    await expect(
      dependencies.useCase.execute({ actor: actor({ permissions: [] }) }),
    ).rejects.toThrow();
    expect(dependencies.clock).not.toHaveBeenCalled();
    expect(dependencies.productRepository.findActive).not.toHaveBeenCalled();
  });

  it('denies an actor without a customer before executing dependencies', async () => {
    const dependencies = setup();

    await expect(
      dependencies.useCase.execute({ actor: actor({ customerId: null }) }),
    ).rejects.toThrow();
    expect(dependencies.clock).not.toHaveBeenCalled();
  });

  it('excludes products without an authorized customer price', async () => {
    const dependencies = setup();
    dependencies.productRepository.findActive.mockResolvedValue(
      Object.freeze([product('product-1'), product('product-2')]),
    );
    dependencies.customerPriceRepository.findActiveByCustomerId.mockResolvedValue(
      Object.freeze([price('product-1'), price('product-2', 'other-customer')]),
    );

    const result = await dependencies.useCase.execute({ actor: actor() });

    expect(result).toHaveLength(1);
    expect(result[0]?.product.id).toBe('product-1');
    expect(result[0]?.price.customerId).toBe('customer-1');
  });

  it('rejects duplicate active prices for one product', async () => {
    const dependencies = setup();
    dependencies.productRepository.findActive.mockResolvedValue(
      Object.freeze([product('product-1')]),
    );
    dependencies.customerPriceRepository.findActiveByCustomerId.mockResolvedValue(
      Object.freeze([
        price('product-1'),
        createCustomerPrice({
          ...price('product-1'),
          id: createCatalogPriceId('second-price'),
        }),
      ]),
    );

    await expect(
      dependencies.useCase.execute({ actor: actor() }),
    ).rejects.toThrow();
  });

  it('propagates repository failures unchanged', async () => {
    const dependencies = setup();
    const failure = new Error('repository unavailable');
    dependencies.productRepository.findActive.mockRejectedValue(failure);

    await expect(dependencies.useCase.execute({ actor: actor() })).rejects.toBe(
      failure,
    );
    expect(
      dependencies.customerPriceRepository.findActiveByCustomerId,
    ).not.toHaveBeenCalled();
  });
});
