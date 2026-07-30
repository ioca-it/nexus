import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FactoryProvider } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getAppConfig } from '@nexus/config';
import {
  DataverseCatalogProductGateway,
  DataverseCatalogProductRepository,
  DataverseCustomerPriceGateway,
  DataverseCustomerPriceRepository,
  GetCustomerCatalogItemUseCase,
  ListCustomerCatalogUseCase,
  type CatalogProductGateway,
  type CatalogProductRepository,
  type CommercialCatalogDataverseClient,
  type CustomerPriceGateway,
  type CustomerPriceRepository,
} from '@nexus/modules/commercial-catalog';
import { FetchDataverseClient } from '@nexus/modules/payment-notifications/infrastructure';
import type { DataverseAccessTokenProvider } from '@nexus/platform';

import { AppModule } from '../app.module';
import { AuthenticatedActorModule } from '../authenticated-actor';
import { DATAVERSE_ACCESS_TOKEN_PROVIDER, DataverseModule } from '../dataverse';
import { FinanceModule } from '../finance';
import { PaymentNotificationsModule } from '../payment-notifications';
import { CommercialCatalogModule } from './commercial-catalog.module';
import { CommercialCatalogController } from './controllers';
import {
  COMMERCIAL_CATALOG_PROVIDERS,
  commercialCatalogClockProviderDefinition,
  commercialCatalogCustomerPriceGatewayProviderDefinition,
  commercialCatalogCustomerPriceRepositoryProviderDefinition,
  commercialCatalogDataverseClientProviderDefinition,
  commercialCatalogProductGatewayProviderDefinition,
  commercialCatalogProductRepositoryProviderDefinition,
  getCustomerCatalogItemUseCaseProviderDefinition,
  listCustomerCatalogUseCaseProviderDefinition,
} from './commercial-catalog.providers';
import {
  COMMERCIAL_CATALOG_CLOCK,
  COMMERCIAL_CATALOG_CUSTOMER_PRICE_GATEWAY,
  COMMERCIAL_CATALOG_CUSTOMER_PRICE_REPOSITORY,
  COMMERCIAL_CATALOG_DATAVERSE_CLIENT,
  COMMERCIAL_CATALOG_PRODUCT_GATEWAY,
  COMMERCIAL_CATALOG_PRODUCT_REPOSITORY,
  GET_CUSTOMER_CATALOG_ITEM_USE_CASE,
  LIST_CUSTOMER_CATALOG_USE_CASE,
} from './commercial-catalog.tokens';

jest.mock('@nexus/config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('@nexus/modules/payment-notifications/infrastructure', () => ({
  FetchDataverseClient: jest.fn(),
}));

jest.mock('@nexus/modules/commercial-catalog', () => ({
  DataverseCatalogProductGateway: jest.fn(),
  DataverseCatalogProductRepository: jest.fn(),
  DataverseCustomerPriceGateway: jest.fn(),
  DataverseCustomerPriceRepository: jest.fn(),
  GetCustomerCatalogItemUseCase: jest.fn(),
  ListCustomerCatalogUseCase: jest.fn(),
}));

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => jest.fn()),
}));

const productSchema = Object.freeze({
  entitySet: 'configured_product_entity',
  fields: Object.freeze({
    id: 'configured_product_id',
    number: 'configured_product_number',
    name: 'configured_product_name',
    description: 'configured_product_description',
    categoryId: 'configured_product_category',
    imageReference: 'configured_product_image',
    unitOfMeasureCode: 'configured_product_uom',
    ecommerceUrl: 'configured_product_ecommerce_url',
    active: 'configured_product_active',
  }),
});

const customerPriceSchema = Object.freeze({
  entitySet: 'configured_price_entity',
  fields: Object.freeze({
    id: 'configured_price_id',
    customerId: 'configured_price_customer',
    productId: 'configured_price_product',
    currencyCode: 'configured_price_currency',
    unitPrice: 'configured_price_amount',
    minimumQuantity: 'configured_price_minimum',
    validFrom: 'configured_price_from',
    validTo: 'configured_price_to',
    active: 'configured_price_active',
  }),
});

const config = Object.freeze({
  dataverse: Object.freeze({
    environmentUrl: 'https://example.crm.dynamics.com/',
    apiVersion: '/v9.2/',
    commercialCatalog: Object.freeze({
      schema: Object.freeze({
        product: productSchema,
        customerPrice: customerPriceSchema,
      }),
    }),
  }),
}) as unknown as ReturnType<typeof getAppConfig>;

const dataverseAccessTokenProvider: DataverseAccessTokenProvider =
  Object.freeze({
    getAccessToken: jest.fn().mockResolvedValue('synthetic-token'),
  });

const dataverseClient: CommercialCatalogDataverseClient = Object.freeze({
  findOne: jest.fn(),
  query: jest.fn(),
});

const productGateway: CatalogProductGateway = Object.freeze({
  findById: jest.fn(),
  findActive: jest.fn(),
});

const customerPriceGateway: CustomerPriceGateway = Object.freeze({
  findActiveByCustomerId: jest.fn(),
  findActiveByCustomerAndProduct: jest.fn(),
});

const productRepository: CatalogProductRepository = Object.freeze({
  findById: jest.fn(),
  findActive: jest.fn(),
});

const customerPriceRepository: CustomerPriceRepository = Object.freeze({
  findActiveByCustomerId: jest.fn(),
  findActiveByCustomerAndProduct: jest.fn(),
});

const listUseCase = Object.freeze({ execute: jest.fn() });
const getUseCase = Object.freeze({ execute: jest.fn() });

const allTokens = [
  COMMERCIAL_CATALOG_DATAVERSE_CLIENT,
  COMMERCIAL_CATALOG_PRODUCT_GATEWAY,
  COMMERCIAL_CATALOG_PRODUCT_REPOSITORY,
  COMMERCIAL_CATALOG_CUSTOMER_PRICE_GATEWAY,
  COMMERCIAL_CATALOG_CUSTOMER_PRICE_REPOSITORY,
  COMMERCIAL_CATALOG_CLOCK,
  LIST_CUSTOMER_CATALOG_USE_CASE,
  GET_CUSTOMER_CATALOG_ITEM_USE_CASE,
] as const;

const exportedTokens = [
  LIST_CUSTOMER_CATALOG_USE_CASE,
  GET_CUSTOMER_CATALOG_ITEM_USE_CASE,
] as const;

const productionSource = [
  'commercial-catalog.tokens.ts',
  'commercial-catalog.providers.ts',
  'commercial-catalog.module.ts',
]
  .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
  .join('\n');

async function createTestingModule() {
  return Test.createTestingModule({
    providers: [
      {
        provide: DATAVERSE_ACCESS_TOKEN_PROVIDER,
        useValue: dataverseAccessTokenProvider,
      },
      ...COMMERCIAL_CATALOG_PROVIDERS,
    ],
  }).compile();
}

describe('Commercial Catalog providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAppConfig).mockReturnValue(config);
    jest
      .mocked(FetchDataverseClient)
      .mockImplementation(() => dataverseClient as FetchDataverseClient);
    jest
      .mocked(DataverseCatalogProductGateway)
      .mockImplementation(
        () => productGateway as DataverseCatalogProductGateway,
      );
    jest
      .mocked(DataverseCustomerPriceGateway)
      .mockImplementation(
        () => customerPriceGateway as DataverseCustomerPriceGateway,
      );
    jest
      .mocked(DataverseCatalogProductRepository)
      .mockImplementation(
        () => productRepository as DataverseCatalogProductRepository,
      );
    jest
      .mocked(DataverseCustomerPriceRepository)
      .mockImplementation(
        () => customerPriceRepository as DataverseCustomerPriceRepository,
      );
    jest
      .mocked(ListCustomerCatalogUseCase)
      .mockImplementation(
        () => listUseCase as unknown as ListCustomerCatalogUseCase,
      );
    jest
      .mocked(GetCustomerCatalogItemUseCase)
      .mockImplementation(
        () => getUseCase as unknown as GetCustomerCatalogItemUseCase,
      );
  });

  it('registers every token as a singleton Symbol', async () => {
    const module = await createTestingModule();
    const registeredTokens = COMMERCIAL_CATALOG_PROVIDERS.map(
      (provider) => (provider as FactoryProvider).provide,
    );

    for (const token of allTokens) {
      expect(typeof token).toBe('symbol');
      expect(registeredTokens).toContain(token);
      expect(module.get(token)).toBe(module.get(token));
    }
  });

  it('imports DataverseModule, registers the controller, and exports only both use cases', () => {
    expect(Reflect.getMetadata('imports', CommercialCatalogModule)).toEqual([
      DataverseModule,
    ]);
    expect(Reflect.getMetadata('exports', CommercialCatalogModule)).toEqual(
      exportedTokens,
    );
    expect(Reflect.getMetadata('controllers', CommercialCatalogModule)).toEqual(
      [CommercialCatalogController],
    );
  });

  it('is imported exactly once from AppModule without replacing existing modules', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

    expect(
      imports.filter((item) => item === CommercialCatalogModule),
    ).toHaveLength(1);
    expect(imports).toContain(PaymentNotificationsModule);
    expect(imports).toContain(FinanceModule);
    expect(imports).toContain(AuthenticatedActorModule);
  });

  it('constructs one Dataverse client with the transversal token provider', async () => {
    await createTestingModule();

    expect(FetchDataverseClient).toHaveBeenCalledTimes(1);
    expect(FetchDataverseClient).toHaveBeenCalledWith({
      baseUrl: 'https://example.crm.dynamics.com/api/data/v9.2',
      getAccessToken: expect.any(Function),
    });
    expect(dataverseAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
  });

  it('delegates token acquisition only when the client requests it', async () => {
    await createTestingModule();
    const dependencies = jest.mocked(FetchDataverseClient).mock.calls[0]?.[0];

    await expect(dependencies?.getAccessToken()).resolves.toBe(
      'synthetic-token',
    );
    expect(dataverseAccessTokenProvider.getAccessToken).toHaveBeenCalledTimes(
      1,
    );
  });

  it('shares the client and passes both configured schemas unchanged', async () => {
    await createTestingModule();

    expect(DataverseCatalogProductGateway).toHaveBeenCalledWith({
      client: dataverseClient,
      schema: productSchema,
    });
    expect(DataverseCustomerPriceGateway).toHaveBeenCalledWith({
      client: dataverseClient,
      schema: customerPriceSchema,
    });
    expect(
      jest.mocked(DataverseCatalogProductGateway).mock.calls[0]?.[0].client,
    ).toBe(
      jest.mocked(DataverseCustomerPriceGateway).mock.calls[0]?.[0].client,
    );
  });

  it('wires each repository to its gateway', async () => {
    await createTestingModule();

    expect(DataverseCatalogProductRepository).toHaveBeenCalledWith(
      productGateway,
    );
    expect(DataverseCustomerPriceRepository).toHaveBeenCalledWith(
      customerPriceGateway,
    );
  });

  it('shares both repositories and the same singleton clock across use cases', async () => {
    const module = await createTestingModule();
    const clock = module.get(COMMERCIAL_CATALOG_CLOCK);
    const expectedDependencies = {
      productRepository,
      customerPriceRepository,
      clock,
    };

    expect(ListCustomerCatalogUseCase).toHaveBeenCalledWith(
      expectedDependencies,
    );
    expect(GetCustomerCatalogItemUseCase).toHaveBeenCalledWith(
      expectedDependencies,
    );
    expect(
      jest.mocked(ListCustomerCatalogUseCase).mock.calls[0]?.[0].clock,
    ).toBe(jest.mocked(GetCustomerCatalogItemUseCase).mock.calls[0]?.[0].clock);
  });

  it('executes every provider factory once and does not execute the clock', async () => {
    const clockFactory = jest.spyOn(
      commercialCatalogClockProviderDefinition,
      'useFactory',
    );
    const module = await createTestingModule();

    for (const token of allTokens) {
      module.get(token);
      module.get(token);
    }

    expect(FetchDataverseClient).toHaveBeenCalledTimes(1);
    expect(DataverseCatalogProductGateway).toHaveBeenCalledTimes(1);
    expect(DataverseCustomerPriceGateway).toHaveBeenCalledTimes(1);
    expect(DataverseCatalogProductRepository).toHaveBeenCalledTimes(1);
    expect(DataverseCustomerPriceRepository).toHaveBeenCalledTimes(1);
    expect(ListCustomerCatalogUseCase).toHaveBeenCalledTimes(1);
    expect(GetCustomerCatalogItemUseCase).toHaveBeenCalledTimes(1);
    expect(clockFactory).toHaveBeenCalledTimes(1);
    expect(module.get(COMMERCIAL_CATALOG_CLOCK)).toEqual(expect.any(Function));

    clockFactory.mockRestore();
  });

  it('performs no external I/O during composition', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await createTestingModule();

    expect(dataverseAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dataverseClient.findOne).not.toHaveBeenCalled();
    expect(dataverseClient.query).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('keeps every injection chain explicit', () => {
    expect(commercialCatalogDataverseClientProviderDefinition.inject).toEqual([
      DATAVERSE_ACCESS_TOKEN_PROVIDER,
    ]);
    expect(commercialCatalogProductGatewayProviderDefinition.inject).toEqual([
      COMMERCIAL_CATALOG_DATAVERSE_CLIENT,
    ]);
    expect(commercialCatalogProductRepositoryProviderDefinition.inject).toEqual(
      [COMMERCIAL_CATALOG_PRODUCT_GATEWAY],
    );
    expect(
      commercialCatalogCustomerPriceGatewayProviderDefinition.inject,
    ).toEqual([COMMERCIAL_CATALOG_DATAVERSE_CLIENT]);
    expect(
      commercialCatalogCustomerPriceRepositoryProviderDefinition.inject,
    ).toEqual([COMMERCIAL_CATALOG_CUSTOMER_PRICE_GATEWAY]);
    expect(commercialCatalogClockProviderDefinition.inject).toBeUndefined();
    expect(listCustomerCatalogUseCaseProviderDefinition.inject).toEqual([
      COMMERCIAL_CATALOG_PRODUCT_REPOSITORY,
      COMMERCIAL_CATALOG_CUSTOMER_PRICE_REPOSITORY,
      COMMERCIAL_CATALOG_CLOCK,
    ]);
    expect(getCustomerCatalogItemUseCaseProviderDefinition.inject).toEqual([
      COMMERCIAL_CATALOG_PRODUCT_REPOSITORY,
      COMMERCIAL_CATALOG_CUSTOMER_PRICE_REPOSITORY,
      COMMERCIAL_CATALOG_CLOCK,
    ]);
  });

  it('contains no forbidden composition concerns or fixed physical names', () => {
    expect(productionSource).not.toMatch(
      /finance|payment-notifications|business.?central|inventory|availableQuantity|@Controller|process\.env|JwtStrategy|Nexus\.Admin|configured_/i,
    );
  });
});
