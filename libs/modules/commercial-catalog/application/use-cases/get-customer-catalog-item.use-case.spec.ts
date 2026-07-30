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
import { GetCustomerCatalogItemUseCase } from './get-customer-catalog-item.use-case';

const AS_OF = new Date('2026-07-29T12:00:00.000Z');
const PRODUCT_ID = createCatalogProductId('product-1');

function actor(options?: {
  readonly customerId?: string | null;
  readonly permissions?: readonly Permission[];
}): AuthenticatedActor {
  const permissions: readonly Permission[] = options?.permissions ?? [
    {
      module: COMMERCIAL_CATALOG_PERMISSION_MODULE,
      action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_PRODUCT,
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

function product(active = true) {
  return createCatalogProduct({
    id: PRODUCT_ID,
    number: createCatalogProductNumber('P-001'),
    name: 'Product one',
    active,
  });
}

function price(customerId = 'customer-1') {
  return createCustomerPrice({
    id: createCatalogPriceId(`price-${customerId}`),
    customerId: createCatalogCustomerId(customerId),
    productId: PRODUCT_ID,
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
  const useCase = new GetCustomerCatalogItemUseCase({
    productRepository,
    customerPriceRepository,
    clock,
  });

  return { productRepository, customerPriceRepository, clock, useCase };
}

describe('GetCustomerCatalogItemUseCase', () => {
  it('returns an authorized item and executes each dependency once', async () => {
    const dependencies = setup();
    const request = Object.freeze({ actor: actor(), productId: PRODUCT_ID });
    dependencies.productRepository.findById.mockResolvedValue(product());
    dependencies.customerPriceRepository.findActiveByCustomerAndProduct.mockResolvedValue(
      price(),
    );

    const result = await dependencies.useCase.execute(request);

    expect(result?.product.id).toBe(PRODUCT_ID);
    expect(result?.price.customerId).toBe('customer-1');
    expect(Object.isFrozen(result)).toBe(true);
    expect(dependencies.clock).toHaveBeenCalledTimes(1);
    expect(dependencies.productRepository.findById).toHaveBeenCalledTimes(1);
    expect(
      dependencies.customerPriceRepository.findActiveByCustomerAndProduct,
    ).toHaveBeenCalledTimes(1);
    expect(
      dependencies.customerPriceRepository.findActiveByCustomerAndProduct,
    ).toHaveBeenCalledWith('customer-1', PRODUCT_ID, AS_OF);
    expect(request.productId).toBe(PRODUCT_ID);
  });

  it.each([
    ['missing', null],
    ['inactive', product(false)],
  ])(
    'returns null for a %s product without consulting prices',
    async (_case, repositoryProduct) => {
      const dependencies = setup();
      dependencies.productRepository.findById.mockResolvedValue(
        repositoryProduct,
      );

      await expect(
        dependencies.useCase.execute({
          actor: actor(),
          productId: PRODUCT_ID,
        }),
      ).resolves.toBeNull();
      expect(
        dependencies.customerPriceRepository.findActiveByCustomerAndProduct,
      ).not.toHaveBeenCalled();
    },
  );

  it('returns null when no customer price exists', async () => {
    const dependencies = setup();
    dependencies.productRepository.findById.mockResolvedValue(product());
    dependencies.customerPriceRepository.findActiveByCustomerAndProduct.mockResolvedValue(
      null,
    );

    await expect(
      dependencies.useCase.execute({
        actor: actor(),
        productId: PRODUCT_ID,
      }),
    ).resolves.toBeNull();
  });

  it('does not expose a price belonging to another customer', async () => {
    const dependencies = setup();
    dependencies.productRepository.findById.mockResolvedValue(product());
    dependencies.customerPriceRepository.findActiveByCustomerAndProduct.mockResolvedValue(
      price('other-customer'),
    );

    await expect(
      dependencies.useCase.execute({
        actor: actor(),
        productId: PRODUCT_ID,
      }),
    ).resolves.toBeNull();
  });

  it.each([
    ['missing permission', actor({ permissions: [] })],
    ['missing customer', actor({ customerId: null })],
  ])('denies %s before reading repositories', async (_case, requestActor) => {
    const dependencies = setup();

    await expect(
      dependencies.useCase.execute({
        actor: requestActor,
        productId: PRODUCT_ID,
      }),
    ).rejects.toThrow();
    expect(dependencies.clock).not.toHaveBeenCalled();
    expect(dependencies.productRepository.findById).not.toHaveBeenCalled();
  });

  it('propagates a repository failure unchanged', async () => {
    const dependencies = setup();
    const failure = new Error('repository unavailable');
    dependencies.productRepository.findById.mockRejectedValue(failure);

    await expect(
      dependencies.useCase.execute({
        actor: actor(),
        productId: PRODUCT_ID,
      }),
    ).rejects.toBe(failure);
  });
});
