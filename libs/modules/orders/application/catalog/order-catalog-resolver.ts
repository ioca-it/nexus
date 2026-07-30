import type { AuthenticatedActor } from '@nexus/platform';
import type { OrderProductId, OrderProductNumber } from '../../domain';

export interface OrderCatalogItemSnapshot {
  readonly productId: OrderProductId;
  readonly productNumber: OrderProductNumber;
  readonly productName: string;
  readonly unitOfMeasureCode?: string;
  readonly currencyCode: string;
  readonly unitPrice: number;
}

export interface OrderCatalogResolver {
  resolveForCustomer(
    actor: AuthenticatedActor,
    productId: OrderProductId,
  ): Promise<OrderCatalogItemSnapshot | null>;
}
