import type { FactoryProvider, Provider } from '@nestjs/common';
import { getAppConfig } from '@nexus/config';
import {
  DataverseCatalogProductGateway,
  DataverseCatalogProductRepository,
  DataverseCustomerPriceGateway,
  DataverseCustomerPriceRepository,
  GetCustomerCatalogItemUseCase,
  ListCustomerCatalogUseCase,
  type CatalogClock,
  type CatalogProductGateway,
  type CatalogProductRepository,
  type CommercialCatalogDataverseClient,
  type CustomerPriceGateway,
  type CustomerPriceRepository,
} from '@nexus/modules/commercial-catalog';
import type { DataverseAccessTokenProvider } from '@nexus/platform';

import {
  createDataverseBaseUrl,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
  FetchDataverseClient,
} from '../dataverse';
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

export const commercialCatalogDataverseClientProviderDefinition: FactoryProvider<CommercialCatalogDataverseClient> =
  {
    provide: COMMERCIAL_CATALOG_DATAVERSE_CLIENT,
    inject: [DATAVERSE_ACCESS_TOKEN_PROVIDER],
    useFactory: (
      dataverseAccessTokenProvider: DataverseAccessTokenProvider,
    ) => {
      const { environmentUrl, apiVersion } = getAppConfig().dataverse;

      return new FetchDataverseClient({
        baseUrl: createDataverseBaseUrl(environmentUrl, apiVersion),
        getAccessToken: () => dataverseAccessTokenProvider.getAccessToken(),
      });
    },
  };

export const commercialCatalogProductGatewayProviderDefinition: FactoryProvider<CatalogProductGateway> =
  {
    provide: COMMERCIAL_CATALOG_PRODUCT_GATEWAY,
    inject: [COMMERCIAL_CATALOG_DATAVERSE_CLIENT],
    useFactory: (client: CommercialCatalogDataverseClient) => {
      const commercialCatalog = getAppConfig().dataverse.commercialCatalog;

      if (commercialCatalog === undefined) {
        throw new Error(
          'Commercial Catalog Dataverse configuration is required',
        );
      }

      return new DataverseCatalogProductGateway({
        client,
        schema: commercialCatalog.schema.product,
      });
    },
  };

export const commercialCatalogProductRepositoryProviderDefinition: FactoryProvider<CatalogProductRepository> =
  {
    provide: COMMERCIAL_CATALOG_PRODUCT_REPOSITORY,
    inject: [COMMERCIAL_CATALOG_PRODUCT_GATEWAY],
    useFactory: (gateway: CatalogProductGateway) =>
      new DataverseCatalogProductRepository(gateway),
  };

export const commercialCatalogCustomerPriceGatewayProviderDefinition: FactoryProvider<CustomerPriceGateway> =
  {
    provide: COMMERCIAL_CATALOG_CUSTOMER_PRICE_GATEWAY,
    inject: [COMMERCIAL_CATALOG_DATAVERSE_CLIENT],
    useFactory: (client: CommercialCatalogDataverseClient) => {
      const commercialCatalog = getAppConfig().dataverse.commercialCatalog;

      if (commercialCatalog === undefined) {
        throw new Error(
          'Commercial Catalog Dataverse configuration is required',
        );
      }

      return new DataverseCustomerPriceGateway({
        client,
        schema: commercialCatalog.schema.customerPrice,
      });
    },
  };

export const commercialCatalogCustomerPriceRepositoryProviderDefinition: FactoryProvider<CustomerPriceRepository> =
  {
    provide: COMMERCIAL_CATALOG_CUSTOMER_PRICE_REPOSITORY,
    inject: [COMMERCIAL_CATALOG_CUSTOMER_PRICE_GATEWAY],
    useFactory: (gateway: CustomerPriceGateway) =>
      new DataverseCustomerPriceRepository(gateway),
  };

export const commercialCatalogClockProviderDefinition: FactoryProvider<CatalogClock> =
  {
    provide: COMMERCIAL_CATALOG_CLOCK,
    useFactory: () => () => new Date(),
  };

export const listCustomerCatalogUseCaseProviderDefinition: FactoryProvider<ListCustomerCatalogUseCase> =
  {
    provide: LIST_CUSTOMER_CATALOG_USE_CASE,
    inject: [
      COMMERCIAL_CATALOG_PRODUCT_REPOSITORY,
      COMMERCIAL_CATALOG_CUSTOMER_PRICE_REPOSITORY,
      COMMERCIAL_CATALOG_CLOCK,
    ],
    useFactory: (
      productRepository: CatalogProductRepository,
      customerPriceRepository: CustomerPriceRepository,
      clock: CatalogClock,
    ) =>
      new ListCustomerCatalogUseCase({
        productRepository,
        customerPriceRepository,
        clock,
      }),
  };

export const getCustomerCatalogItemUseCaseProviderDefinition: FactoryProvider<GetCustomerCatalogItemUseCase> =
  {
    provide: GET_CUSTOMER_CATALOG_ITEM_USE_CASE,
    inject: [
      COMMERCIAL_CATALOG_PRODUCT_REPOSITORY,
      COMMERCIAL_CATALOG_CUSTOMER_PRICE_REPOSITORY,
      COMMERCIAL_CATALOG_CLOCK,
    ],
    useFactory: (
      productRepository: CatalogProductRepository,
      customerPriceRepository: CustomerPriceRepository,
      clock: CatalogClock,
    ) =>
      new GetCustomerCatalogItemUseCase({
        productRepository,
        customerPriceRepository,
        clock,
      }),
  };

// Opti ChatGPT: composición singleton para reutilizar cliente, gateways, repositorios y reloj.
export const COMMERCIAL_CATALOG_PROVIDERS: Provider[] = [
  commercialCatalogDataverseClientProviderDefinition,
  commercialCatalogProductGatewayProviderDefinition,
  commercialCatalogProductRepositoryProviderDefinition,
  commercialCatalogCustomerPriceGatewayProviderDefinition,
  commercialCatalogCustomerPriceRepositoryProviderDefinition,
  commercialCatalogClockProviderDefinition,
  listCustomerCatalogUseCaseProviderDefinition,
  getCustomerCatalogItemUseCaseProviderDefinition,
];
