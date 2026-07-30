import type { FactoryProvider, Provider } from '@nestjs/common';
import { getAppConfig } from '@nexus/config';
import { FetchDataverseClient } from '@nexus/modules/payment-notifications/infrastructure';
import {
  DataverseOrderGateway,
  DataverseOrderLineGateway,
  DataverseOrderRepository,
  type OrdersDataverseClient,
} from '@nexus/modules/orders';
import {
  CreateDraftOrderUseCase,
  UpdateDraftOrderLinesUseCase,
  GetOrderByIdUseCase,
  ListCustomerOrdersUseCase,
  type OrderCatalogResolver,
  type OrderClock,
  type OrderRepository,
  type OrderGateway,
  type OrderLineGateway,
} from '@nexus/modules/orders';
import { GetCustomerCatalogItemUseCase } from '@nexus/modules/commercial-catalog';
import type { DataverseAccessTokenProvider } from '@nexus/platform';
import { randomUUID } from 'node:crypto';
import type { OrderIdGenerator } from './orders.tokens';
import {
  createDataverseBaseUrl,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
} from '../dataverse';
import { GET_CUSTOMER_CATALOG_ITEM_USE_CASE } from '../commercial-catalog';
import { CommercialCatalogOrderCatalogResolver } from './commercial-catalog-order-catalog.resolver';
import {
  ORDERS_DATAVERSE_CLIENT,
  ORDERS_GATEWAY,
  ORDER_LINES_GATEWAY,
  ORDERS_REPOSITORY,
  ORDERS_CATALOG_RESOLVER,
  ORDERS_CLOCK,
  CREATE_DRAFT_ORDER_USE_CASE,
  UPDATE_DRAFT_ORDER_LINES_USE_CASE,
  GET_ORDER_BY_ID_USE_CASE,
  LIST_CUSTOMER_ORDERS_USE_CASE,
  ORDER_ID_GENERATOR,
} from './orders.tokens';

export const ordersDataverseClientProvider: FactoryProvider<OrdersDataverseClient> =
  {
    provide: ORDERS_DATAVERSE_CLIENT,
    inject: [DATAVERSE_ACCESS_TOKEN_PROVIDER],
    useFactory: (provider: DataverseAccessTokenProvider) => {
      const { environmentUrl, apiVersion } = getAppConfig().dataverse;
      return new FetchDataverseClient({
        baseUrl: createDataverseBaseUrl(environmentUrl, apiVersion),
        getAccessToken: () => provider.getAccessToken(),
      });
    },
  };
export const ordersGatewayProvider: FactoryProvider = {
  provide: ORDERS_GATEWAY,
  inject: [ORDERS_DATAVERSE_CLIENT],
  useFactory: (client: OrdersDataverseClient) =>
    new DataverseOrderGateway(
      client,
      getAppConfig().dataverse.orders.schema.order,
    ),
};
export const orderLinesGatewayProvider: FactoryProvider = {
  provide: ORDER_LINES_GATEWAY,
  inject: [ORDERS_DATAVERSE_CLIENT],
  useFactory: (client: OrdersDataverseClient) =>
    new DataverseOrderLineGateway(
      client,
      getAppConfig().dataverse.orders.schema.orderLine,
    ),
};
export const ordersRepositoryProvider: FactoryProvider<OrderRepository> = {
  provide: ORDERS_REPOSITORY,
  inject: [ORDERS_GATEWAY, ORDER_LINES_GATEWAY],
  useFactory: (orders: OrderGateway, lines: OrderLineGateway) =>
    new DataverseOrderRepository(orders, lines),
};
export const ordersCatalogResolverProvider: FactoryProvider<OrderCatalogResolver> =
  {
    provide: ORDERS_CATALOG_RESOLVER,
    inject: [GET_CUSTOMER_CATALOG_ITEM_USE_CASE],
    useFactory: (catalog: GetCustomerCatalogItemUseCase) =>
      new CommercialCatalogOrderCatalogResolver(catalog),
  };
export const ordersClockProvider: FactoryProvider<OrderClock> = {
  provide: ORDERS_CLOCK,
  useFactory: () => () => new Date(),
};
export const orderIdGeneratorProvider: FactoryProvider<OrderIdGenerator> = {
  provide: ORDER_ID_GENERATOR,
  useFactory: () => () => randomUUID() as never,
};
export const createDraftOrderProvider: FactoryProvider<CreateDraftOrderUseCase> =
  {
    provide: CREATE_DRAFT_ORDER_USE_CASE,
    inject: [ORDERS_REPOSITORY, ORDERS_CLOCK],
    useFactory: (repository: OrderRepository, clock: OrderClock) =>
      new CreateDraftOrderUseCase({ repository, clock }),
  };
export const updateDraftOrderLinesProvider: FactoryProvider<UpdateDraftOrderLinesUseCase> =
  {
    provide: UPDATE_DRAFT_ORDER_LINES_USE_CASE,
    inject: [ORDERS_REPOSITORY, ORDERS_CATALOG_RESOLVER, ORDERS_CLOCK],
    useFactory: (
      repository: OrderRepository,
      catalogResolver: OrderCatalogResolver,
      clock: OrderClock,
    ) =>
      new UpdateDraftOrderLinesUseCase({ repository, catalogResolver, clock }),
  };
export const getOrderByIdProvider: FactoryProvider<GetOrderByIdUseCase> = {
  provide: GET_ORDER_BY_ID_USE_CASE,
  inject: [ORDERS_REPOSITORY],
  useFactory: (repository: OrderRepository) =>
    new GetOrderByIdUseCase({ repository }),
};
export const listCustomerOrdersProvider: FactoryProvider<ListCustomerOrdersUseCase> =
  {
    provide: LIST_CUSTOMER_ORDERS_USE_CASE,
    inject: [ORDERS_REPOSITORY],
    useFactory: (repository: OrderRepository) =>
      new ListCustomerOrdersUseCase({ repository }),
  };
export const ORDERS_PROVIDERS: Provider[] = [
  ordersDataverseClientProvider,
  ordersGatewayProvider,
  orderLinesGatewayProvider,
  ordersRepositoryProvider,
  ordersCatalogResolverProvider,
  ordersClockProvider,
  orderIdGeneratorProvider,
  createDraftOrderProvider,
  updateDraftOrderLinesProvider,
  getOrderByIdProvider,
  listCustomerOrdersProvider,
];
