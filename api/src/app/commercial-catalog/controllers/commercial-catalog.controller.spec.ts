import { readFileSync } from 'node:fs';

import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import {
  createCatalogCustomerId,
  createCatalogItem,
  createCatalogPriceId,
  createCatalogProduct,
  createCatalogProductId,
  createCatalogProductNumber,
  createCustomerPrice,
  type GetCustomerCatalogItemUseCase,
  type ListCustomerCatalogUseCase,
} from '@nexus/modules/commercial-catalog';
import { createAuthenticatedActor } from '@nexus/platform';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CommercialCatalogController } from './commercial-catalog.controller';

const actor = createAuthenticatedActor({
  userId: 'actor-1',
  customerId: 'customer-1',
  roles: [],
  permissions: [],
  approvalGroupIds: [],
});

function catalogItem() {
  const product = createCatalogProduct({
    id: createCatalogProductId('product-1'),
    number: createCatalogProductNumber('P-001'),
    name: 'Product one',
    description: 'Description',
    ecommerceUrl: 'https://shop.example.test/products/P-001',
    active: true,
  });
  const price = createCustomerPrice({
    id: createCatalogPriceId('price-1'),
    customerId: createCatalogCustomerId('customer-1'),
    productId: product.id,
    currencyCode: 'USD',
    unitPrice: 12.5,
    active: true,
  });

  return createCatalogItem(product, price);
}

function setup() {
  const item = catalogItem();
  const listCustomerCatalogUseCase = {
    execute: jest.fn().mockResolvedValue([item]),
  };
  const getCustomerCatalogItemUseCase = {
    execute: jest.fn().mockResolvedValue(item),
  };

  return {
    controller: new CommercialCatalogController(
      listCustomerCatalogUseCase as unknown as ListCustomerCatalogUseCase,
      getCustomerCatalogItemUseCase as unknown as GetCustomerCatalogItemUseCase,
    ),
    listCustomerCatalogUseCase,
    getCustomerCatalogItemUseCase,
    item,
  };
}

describe('CommercialCatalogController', () => {
  it('declares exactly the two approved authenticated GET endpoints', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, CommercialCatalogController),
    ).toBe('commercial-catalog');
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CommercialCatalogController),
    ).toContain(JwtAuthGuard);

    const routes = [
      ['listCatalog', '/'],
      ['getProduct', 'products/:productId'],
    ] as const;

    for (const [method, path] of routes) {
      const handler = CommercialCatalogController.prototype[method];
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
        RequestMethod.GET,
      );
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(
        HttpStatus.OK,
      );
    }

    const routeCount = Object.getOwnPropertyNames(
      CommercialCatalogController.prototype,
    ).filter((method) =>
      Reflect.hasMetadata(
        METHOD_METADATA,
        CommercialCatalogController.prototype[
          method as keyof CommercialCatalogController
        ],
      ),
    ).length;

    expect(routeCount).toBe(2);
  });

  it('lists the catalog once using exactly the CurrentActor reference', async () => {
    const { controller, listCustomerCatalogUseCase, item } = setup();

    const response = await controller.listCatalog(actor);

    expect(listCustomerCatalogUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listCustomerCatalogUseCase.execute).toHaveBeenCalledWith({ actor });
    expect(
      listCustomerCatalogUseCase.execute.mock.calls[0]?.[0],
    ).not.toHaveProperty('customerId');
    expect(response).toHaveLength(1);
    expect(response[0]).not.toBe(item);
    expect(response[0]?.product.ecommerceUrl).toBe(
      'https://shop.example.test/products/P-001',
    );
    expect(Object.isFrozen(response)).toBe(true);
    expect(JSON.stringify(response)).not.toMatch(
      /customerId|productId|active|inventory|availableQuantity/i,
    );
  });

  it('gets one authorized product with actor and normalized productId', async () => {
    const { controller, getCustomerCatalogItemUseCase, item } = setup();

    const response = await controller.getProduct(' product-1 ', actor);

    expect(getCustomerCatalogItemUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getCustomerCatalogItemUseCase.execute).toHaveBeenCalledWith({
      actor,
      productId: 'product-1',
    });
    expect(
      getCustomerCatalogItemUseCase.execute.mock.calls[0]?.[0],
    ).not.toHaveProperty('customerId');
    expect(response).not.toBe(item);
    expect(response.product.id).toBe('product-1');
    expect(response.product.ecommerceUrl).toBe(
      'https://shop.example.test/products/P-001',
    );
  });

  it('converts an unauthorized or missing product to a generic 404', async () => {
    const { controller, getCustomerCatalogItemUseCase } = setup();
    getCustomerCatalogItemUseCase.execute.mockResolvedValue(null);

    await expect(
      controller.getProduct('product-unknown', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(getCustomerCatalogItemUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it.each(['', '   '])(
    'rejects invalid productId before the use case executes',
    async (productId) => {
      const { controller, getCustomerCatalogItemUseCase } = setup();

      await expect(
        controller.getProduct(productId, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(getCustomerCatalogItemUseCase.execute).not.toHaveBeenCalled();
    },
  );

  it('propagates technical use-case errors unchanged', async () => {
    const { controller, listCustomerCatalogUseCase } = setup();
    const failure = new Error('Technical failure');
    listCustomerCatalogUseCase.execute.mockRejectedValue(failure);

    await expect(controller.listCatalog(actor)).rejects.toBe(failure);
  });

  it('uses CurrentActor exclusively and has no infrastructure or manual authorization', () => {
    const source = readFileSync(__filename.replace('.spec.ts', '.ts'), 'utf8');

    expect(source.match(/@CurrentActor\(\)/g)).toHaveLength(2);
    expect(source).not.toMatch(/@Body|@Query|@Headers/);
    expect(source).not.toMatch(
      /actor\.roles|Nexus\.Admin|RolesGuard|evaluatePermission|repository|gateway|Dataverse|BusinessCentral/,
    );
    expect(source).not.toMatch(/customerId|price\.id|price\.productId/);
  });
});
