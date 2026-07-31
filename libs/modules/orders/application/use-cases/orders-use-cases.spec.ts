import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AuthenticatedActor, Permission } from '@nexus/platform';
import {
  Order,
  createOrderCustomerId,
  createOrderId,
  createOrderLine,
  createOrderLineId,
  createOrderProductId,
  createOrderProductNumber,
  type OrderRepository,
} from '../../domain';
import type {
  OrderCatalogItemSnapshot,
  OrderCatalogResolver,
} from '../catalog';
import {
  ORDERS_PERMISSION_ACTIONS,
  ORDERS_PERMISSION_MODULE,
} from '../security';
import { CreateDraftOrderUseCase } from './create-draft-order.use-case';
import { GetOrderByIdUseCase } from './get-order-by-id.use-case';
import { ListCustomerOrdersUseCase } from './list-customer-orders.use-case';
import { UpdateDraftOrderLinesUseCase } from './update-draft-order-lines.use-case';

const ids = Object.freeze({
  order: createOrderId('order-1'),
  customer: createOrderCustomerId('customer-1'),
  otherCustomer: createOrderCustomerId('customer-2'),
  line: createOrderLineId('line-1'),
  product: createOrderProductId('product-1'),
  productNumber: createOrderProductNumber('SKU-1'),
});

function permission(
  action: (typeof ORDERS_PERMISSION_ACTIONS)[keyof typeof ORDERS_PERMISSION_ACTIONS],
  effect: Permission['effect'] = 'allow',
): Permission {
  return Object.freeze({
    module: ORDERS_PERMISSION_MODULE,
    action,
    effect,
  });
}

function actor(
  options: {
    readonly customerId?: string | null;
    readonly permissions?: readonly Permission[];
    readonly roles?: readonly string[];
  } = {},
): AuthenticatedActor {
  return Object.freeze({
    userId: 'user-1',
    customerId:
      options.customerId === undefined ? ids.customer : options.customerId,
    roles: Object.freeze([...(options.roles ?? [])]),
    permissions: Object.freeze([...(options.permissions ?? [])]),
    approvalGroupIds: Object.freeze([]),
  });
}

function order(
  customerId = ids.customer,
  lines: readonly ReturnType<typeof createOrderLine>[] = [],
): Order {
  return Order.create({
    id: ids.order,
    customerId,
    currencyCode: 'USD',
    lines,
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  });
}

function snapshot(
  overrides: Partial<OrderCatalogItemSnapshot> = {},
): OrderCatalogItemSnapshot {
  return Object.freeze({
    productId: ids.product,
    productNumber: ids.productNumber,
    productName: 'Authorized Product',
    unitOfMeasureCode: 'EA',
    currencyCode: 'USD',
    unitPrice: 12.5,
    ...overrides,
  });
}

function repository(
  overrides: Partial<jest.Mocked<OrderRepository>> = {},
): jest.Mocked<OrderRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByCustomerId: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function catalogResolver(
  overrides: Partial<jest.Mocked<OrderCatalogResolver>> = {},
): jest.Mocked<OrderCatalogResolver> {
  return {
    resolveForCustomer: jest.fn().mockResolvedValue(snapshot()),
    ...overrides,
  };
}

describe('CreateDraftOrderUseCase', () => {
  it('derives customerId from the actor, calls clock once, and persists once', async () => {
    const repo = repository();
    const clock = jest
      .fn()
      .mockReturnValue(new Date('2026-07-30T12:00:00.000Z'));
    const useCase = new CreateDraftOrderUseCase({
      repository: repo,
      clock,
    });

    const result = await useCase.execute({
      actor: actor({
        customerId: ' customer-1 ',
        permissions: [permission(ORDERS_PERMISSION_ACTIONS.CREATE_DRAFT)],
      }),
      id: ids.order,
      currencyCode: ' USD ',
    });

    expect(result.customerId).toBe(ids.customer);
    expect(result.currencyCode).toBe('USD');
    expect(result.lines).toEqual([]);
    expect(result.createdAt.toISOString()).toBe('2026-07-30T12:00:00.000Z');
    expect(result.updatedAt.toISOString()).toBe('2026-07-30T12:00:00.000Z');
    expect(clock).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledWith(result);
  });

  it('does not accept external customerId, status, or subtotal', async () => {
    const repo = repository();
    const useCase = new CreateDraftOrderUseCase({
      repository: repo,
      clock: () => new Date('2026-07-30T12:00:00.000Z'),
    });
    const request = {
      actor: actor({
        customerId: ids.customer,
        permissions: [permission(ORDERS_PERMISSION_ACTIONS.CREATE_DRAFT)],
      }),
      id: ids.order,
      currencyCode: 'USD',
      customerId: ids.otherCustomer,
      status: 'SUBMITTED',
      subtotal: 999,
    };

    const result = await useCase.execute(request);

    expect(result.customerId).toBe(ids.customer);
    expect(result.status).toBe('DRAFT');
    expect(result.subtotal).toBe(0);
  });

  it('denies a missing customer or permission before clock and persistence', async () => {
    const repo = repository();
    const clock = jest.fn().mockReturnValue(new Date());
    const useCase = new CreateDraftOrderUseCase({
      repository: repo,
      clock,
    });

    await expect(
      useCase.execute({
        actor: actor({ customerId: null, roles: ['Nexus.Admin'] }),
        id: ids.order,
        currencyCode: 'USD',
      }),
    ).rejects.toThrow('Order access denied');
    expect(clock).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propagates clock and repository errors unchanged', async () => {
    const clockError = new Error('clock failed');
    const repositoryError = new Error('repository failed');
    const authorizedActor = actor({
      permissions: [permission(ORDERS_PERMISSION_ACTIONS.CREATE_DRAFT)],
    });

    await expect(
      new CreateDraftOrderUseCase({
        repository: repository(),
        clock: () => {
          throw clockError;
        },
      }).execute({
        actor: authorizedActor,
        id: ids.order,
        currencyCode: 'USD',
      }),
    ).rejects.toBe(clockError);

    await expect(
      new CreateDraftOrderUseCase({
        repository: repository({
          create: jest.fn().mockRejectedValue(repositoryError),
        }),
        clock: () => new Date(),
      }).execute({
        actor: authorizedActor,
        id: ids.order,
        currencyCode: 'USD',
      }),
    ).rejects.toBe(repositoryError);
  });
});

describe('UpdateDraftOrderLinesUseCase', () => {
  const authorizedActor = actor({
    permissions: [permission(ORDERS_PERMISSION_ACTIONS.UPDATE_DRAFT)],
  });

  it('loads once, resolves each product once, snapshots catalog data, and updates once', async () => {
    const original = order();
    const repo = repository({
      findById: jest.fn().mockResolvedValue(original),
    });
    const resolver = catalogResolver();
    const clock = jest
      .fn()
      .mockReturnValue(new Date('2026-07-30T13:00:00.000Z'));
    const useCase = new UpdateDraftOrderLinesUseCase({
      repository: repo,
      catalogResolver: resolver,
      clock,
    });
    const request = {
      actor: authorizedActor,
      orderId: ids.order,
      lines: [
        {
          id: ids.line,
          productId: ids.product,
          quantity: 2,
          unitPrice: 0,
          currencyCode: 'EUR',
          productName: 'Untrusted',
        },
      ],
    };

    const result = await useCase.execute(request);

    expect(repo.findById).toHaveBeenCalledTimes(1);
    expect(repo.findById).toHaveBeenCalledWith(ids.order);
    expect(resolver.resolveForCustomer).toHaveBeenCalledTimes(1);
    expect(resolver.resolveForCustomer).toHaveBeenCalledWith(
      authorizedActor,
      ids.product,
    );
    expect(result.lines[0]).toEqual({
      id: ids.line,
      productId: ids.product,
      productNumber: ids.productNumber,
      productName: 'Authorized Product',
      quantity: 2,
      unitOfMeasureCode: 'EA',
      currencyCode: 'USD',
      unitPrice: 12.5,
      lineSubtotal: 25,
    });
    expect(clock).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledWith(result);
    expect(result).not.toBe(original);
    expect(original.lines).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.lines)).toBe(true);
  });

  it('resolves every distinct product exactly once', async () => {
    const product2 = createOrderProductId('product-2');
    const resolver = catalogResolver({
      resolveForCustomer: jest
        .fn()
        .mockResolvedValueOnce(snapshot())
        .mockResolvedValueOnce(
          snapshot({
            productId: product2,
            productNumber: createOrderProductNumber('SKU-2'),
          }),
        ),
    });
    const repo = repository({
      findById: jest.fn().mockResolvedValue(order()),
    });
    const useCase = new UpdateDraftOrderLinesUseCase({
      repository: repo,
      catalogResolver: resolver,
      clock: () => new Date('2026-07-30T13:00:00.000Z'),
    });

    await useCase.execute({
      actor: authorizedActor,
      orderId: ids.order,
      lines: [
        { id: ids.line, productId: ids.product, quantity: 1 },
        {
          id: createOrderLineId('line-2'),
          productId: product2,
          quantity: 1,
        },
      ],
    });

    expect(resolver.resolveForCustomer).toHaveBeenCalledTimes(2);
    expect(resolver.resolveForCustomer).toHaveBeenNthCalledWith(
      1,
      authorizedActor,
      ids.product,
    );
    expect(resolver.resolveForCustomer).toHaveBeenNthCalledWith(
      2,
      authorizedActor,
      product2,
    );
  });

  it('rejects duplicate normalized line ids before catalog, clock, or update', async () => {
    const repo = repository({
      findById: jest.fn().mockResolvedValue(order()),
    });
    const resolver = catalogResolver();
    const clock = jest.fn().mockReturnValue(new Date());
    const useCase = new UpdateDraftOrderLinesUseCase({
      repository: repo,
      catalogResolver: resolver,
      clock,
    });

    await expect(
      useCase.execute({
        actor: authorizedActor,
        orderId: ids.order,
        lines: [
          { id: ids.line, productId: ids.product, quantity: 1 },
          {
            id: createOrderLineId(' line-1 '),
            productId: createOrderProductId('product-2'),
            quantity: 1,
          },
        ],
      }),
    ).rejects.toThrow('Duplicate order line id');
    expect(resolver.resolveForCustomer).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects duplicate normalized product ids before catalog, clock, or update', async () => {
    const repo = repository({
      findById: jest.fn().mockResolvedValue(order()),
    });
    const resolver = catalogResolver();
    const clock = jest.fn().mockReturnValue(new Date());
    const useCase = new UpdateDraftOrderLinesUseCase({
      repository: repo,
      catalogResolver: resolver,
      clock,
    });

    await expect(
      useCase.execute({
        actor: authorizedActor,
        orderId: ids.order,
        lines: [
          { id: ids.line, productId: ids.product, quantity: 1 },
          {
            id: createOrderLineId('line-2'),
            productId: createOrderProductId(' product-1 '),
            quantity: 1,
          },
        ],
      }),
    ).rejects.toThrow('Duplicate order product id');
    expect(resolver.resolveForCustomer).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rejects incompatible catalog currency without clock or persistence', async () => {
    const repo = repository({
      findById: jest.fn().mockResolvedValue(order()),
    });
    const resolver = catalogResolver({
      resolveForCustomer: jest
        .fn()
        .mockResolvedValue(snapshot({ currencyCode: 'EUR' })),
    });
    const clock = jest.fn().mockReturnValue(new Date());
    const useCase = new UpdateDraftOrderLinesUseCase({
      repository: repo,
      catalogResolver: resolver,
      clock,
    });

    await expect(
      useCase.execute({
        actor: authorizedActor,
        orderId: ids.order,
        lines: [{ id: ids.line, productId: ids.product, quantity: 1 }],
      }),
    ).rejects.toThrow('Catalog item currency does not match order currency');
    expect(clock).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it.each([
    ['missing catalog item', null],
    [
      'mismatched catalog product',
      snapshot({ productId: createOrderProductId('other-product') }),
    ],
  ] as const)(
    'does not clock or persist for %s',
    async (_caseName, resolvedSnapshot) => {
      const repo = repository({
        findById: jest.fn().mockResolvedValue(order()),
      });
      const resolver = catalogResolver({
        resolveForCustomer: jest.fn().mockResolvedValue(resolvedSnapshot),
      });
      const clock = jest.fn().mockReturnValue(new Date());
      const useCase = new UpdateDraftOrderLinesUseCase({
        repository: repo,
        catalogResolver: resolver,
        clock,
      });

      await expect(
        useCase.execute({
          actor: authorizedActor,
          orderId: ids.order,
          lines: [{ id: ids.line, productId: ids.product, quantity: 1 }],
        }),
      ).rejects.toThrow();
      expect(clock).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  it('propagates technical catalog errors without clock or persistence', async () => {
    const technicalError = new Error('catalog unavailable');
    const repo = repository({
      findById: jest.fn().mockResolvedValue(order()),
    });
    const resolver = catalogResolver({
      resolveForCustomer: jest.fn().mockRejectedValue(technicalError),
    });
    const clock = jest.fn().mockReturnValue(new Date());
    const useCase = new UpdateDraftOrderLinesUseCase({
      repository: repo,
      catalogResolver: resolver,
      clock,
    });

    await expect(
      useCase.execute({
        actor: authorizedActor,
        orderId: ids.order,
        lines: [{ id: ids.line, productId: ids.product, quantity: 1 }],
      }),
    ).rejects.toBe(technicalError);
    expect(clock).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows an empty line list to clear a draft atomically', async () => {
    const existing = order(ids.customer, [
      createOrderLine({
        id: ids.line,
        productId: ids.product,
        productNumber: ids.productNumber,
        productName: 'Product',
        quantity: 1,
        currencyCode: 'USD',
        unitPrice: 2,
      }),
    ]);
    const repo = repository({
      findById: jest.fn().mockResolvedValue(existing),
    });
    const resolver = catalogResolver();
    const clock = jest.fn().mockReturnValue(new Date('2026-07-30T13:00:00Z'));
    const useCase = new UpdateDraftOrderLinesUseCase({
      repository: repo,
      catalogResolver: resolver,
      clock,
    });

    const result = await useCase.execute({
      actor: authorizedActor,
      orderId: ids.order,
      lines: [],
    });

    expect(result.lines).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(resolver.resolveForCustomer).not.toHaveBeenCalled();
    expect(clock).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(existing.lines).toHaveLength(1);
  });

  it('throws documented not-found and enforces ownership before resolution', async () => {
    const missingRepo = repository();
    const missingResolver = catalogResolver();
    const missingUseCase = new UpdateDraftOrderLinesUseCase({
      repository: missingRepo,
      catalogResolver: missingResolver,
      clock: () => new Date(),
    });

    await expect(
      missingUseCase.execute({
        actor: authorizedActor,
        orderId: ids.order,
        lines: [],
      }),
    ).rejects.toThrow('Order not found');
    expect(missingRepo.findById).toHaveBeenCalledTimes(1);

    const otherRepo = repository({
      findById: jest.fn().mockResolvedValue(order(ids.otherCustomer)),
    });
    const otherResolver = catalogResolver();
    const otherUseCase = new UpdateDraftOrderLinesUseCase({
      repository: otherRepo,
      catalogResolver: otherResolver,
      clock: () => new Date(),
    });

    await expect(
      otherUseCase.execute({
        actor: authorizedActor,
        orderId: ids.order,
        lines: [],
      }),
    ).rejects.toThrow('Order access denied');
    expect(otherResolver.resolveForCustomer).not.toHaveBeenCalled();
    expect(otherRepo.update).not.toHaveBeenCalled();
  });

  it('contains no inventory, Business Central, or request commercial fields', () => {
    const source = readFileSync(
      join(__dirname, 'update-draft-order-lines.use-case.ts'),
      'utf8',
    );
    const requestInterface = source.slice(
      source.indexOf('export interface UpdateDraftOrderLineInput'),
      source.indexOf('export interface UpdateDraftOrderLinesDependencies'),
    );

    expect(requestInterface).not.toMatch(
      /unitPrice|currencyCode|productName|productNumber|customerId|inventory|availableQuantity/i,
    );
    expect(source).not.toMatch(/BusinessCentral|Dataverse/);
  });
});

describe('Orders read use cases', () => {
  const readActor = actor({
    permissions: [permission(ORDERS_PERMISSION_ACTIONS.READ_ORDERS)],
  });

  it('Get returns null once and applies customer ownership', async () => {
    const missingRepository = repository();
    const missingUseCase = new GetOrderByIdUseCase({
      repository: missingRepository,
    });

    await expect(
      missingUseCase.execute({ actor: readActor, id: ids.order }),
    ).resolves.toBeNull();
    expect(missingRepository.findById).toHaveBeenCalledTimes(1);

    const otherRepository = repository({
      findById: jest.fn().mockResolvedValue(order(ids.otherCustomer)),
    });
    const otherUseCase = new GetOrderByIdUseCase({
      repository: otherRepository,
    });

    await expect(
      otherUseCase.execute({ actor: readActor, id: ids.order }),
    ).rejects.toThrow('Order access denied');
    expect(otherRepository.findById).toHaveBeenCalledTimes(1);
  });

  it('Get requires customer ownership even with explicit permission', async () => {
    const existing = order();
    const repo = repository({
      findById: jest.fn().mockResolvedValue(existing),
    });
    const useCase = new GetOrderByIdUseCase({ repository: repo });

    await expect(
      useCase.execute({
        actor: actor({
          customerId: null,
          roles: ['Nexus.Admin'],
          permissions: [permission(ORDERS_PERMISSION_ACTIONS.READ_ORDERS)],
        }),
        id: ids.order,
      }),
    ).rejects.toThrow('Order access denied');
    await expect(
      useCase.execute({
        actor: actor({ customerId: null, roles: ['Nexus.Admin'] }),
        id: ids.order,
      }),
    ).rejects.toThrow('Order access denied');
  });

  it('List derives customer only from actor and returns a frozen copy', async () => {
    const existing = order();
    const returned = [existing];
    const repo = repository({
      findByCustomerId: jest.fn().mockResolvedValue(returned),
    });
    const useCase = new ListCustomerOrdersUseCase({ repository: repo });

    const result = await useCase.execute({ actor: readActor });
    returned.length = 0;

    expect(repo.findByCustomerId).toHaveBeenCalledTimes(1);
    expect(repo.findByCustomerId).toHaveBeenCalledWith(ids.customer);
    expect(result).toEqual([existing]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('List rejects administrative context and propagates repository errors', async () => {
    const repo = repository();
    const useCase = new ListCustomerOrdersUseCase({ repository: repo });

    await expect(
      useCase.execute({
        actor: actor({
          customerId: null,
          permissions: [permission(ORDERS_PERMISSION_ACTIONS.READ_ORDERS)],
        }),
      }),
    ).rejects.toThrow('Order access denied');
    expect(repo.findByCustomerId).not.toHaveBeenCalled();

    const technicalError = new Error('read failed');
    const failingUseCase = new ListCustomerOrdersUseCase({
      repository: repository({
        findByCustomerId: jest.fn().mockRejectedValue(technicalError),
      }),
    });

    await expect(failingUseCase.execute({ actor: readActor })).rejects.toBe(
      technicalError,
    );
  });
});
