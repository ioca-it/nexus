import type { AuthenticatedActor } from '@nexus/platform';
import { GetCustomerCatalogItemUseCase } from '@nexus/modules/commercial-catalog';
import type {
  OrderCatalogResolver,
  OrderCatalogItemSnapshot,
} from '@nexus/modules/orders';
import type { OrderProductId } from '@nexus/modules/orders';

export class CommercialCatalogOrderCatalogResolver
  implements OrderCatalogResolver
{
  constructor(private readonly catalog: GetCustomerCatalogItemUseCase) {
    Object.freeze(this);
  }

  async resolveForCustomer(
    actor: AuthenticatedActor,
    productId: OrderProductId,
  ): Promise<OrderCatalogItemSnapshot | null> {
    const item = await this.catalog.execute({
      actor,
      productId: productId as never,
    });
    if (item === null) return null;
    return Object.freeze({
      productId: item.product.id as never,
      productNumber: item.product.number as never,
      productName: item.product.name,
      ...(item.product.unitOfMeasureCode === undefined
        ? {}
        : { unitOfMeasureCode: item.product.unitOfMeasureCode }),
      currencyCode: item.price.currencyCode,
      unitPrice: item.price.unitPrice,
    });
  }
}
