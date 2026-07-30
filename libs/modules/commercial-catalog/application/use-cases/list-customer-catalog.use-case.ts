import type { AuthenticatedActor } from '@nexus/platform';
import {
  createCatalogItem,
  type CatalogItem,
  type CatalogProductId,
  type CatalogProductRepository,
  type CustomerPrice,
  type CustomerPriceRepository,
} from '../../domain';
import type { CatalogClock } from '../catalog-clock';
import { COMMERCIAL_CATALOG_PERMISSION_ACTIONS } from '../security';
import {
  assertCommercialCatalogPermission,
  requireCatalogCustomerId,
} from './commercial-catalog-access';

export interface ListCustomerCatalogRequest {
  readonly actor: AuthenticatedActor;
}

export interface ListCustomerCatalogDependencies {
  readonly productRepository: CatalogProductRepository;
  readonly customerPriceRepository: CustomerPriceRepository;
  readonly clock: CatalogClock;
}

export class ListCustomerCatalogUseCase {
  constructor(private readonly dependencies: ListCustomerCatalogDependencies) {}

  async execute(
    request: ListCustomerCatalogRequest,
  ): Promise<readonly CatalogItem[]> {
    assertCommercialCatalogPermission(
      request.actor,
      COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_CATALOG,
    );
    const customerId = requireCatalogCustomerId(request.actor);
    const asOf = this.dependencies.clock();
    const products = await this.dependencies.productRepository.findActive();
    const prices =
      await this.dependencies.customerPriceRepository.findActiveByCustomerId(
        customerId,
        asOf,
      );

    // Opti ChatGPT: índice de precios por producto para evitar recorridos cuadráticos.
    const priceByProductId = new Map<CatalogProductId, CustomerPrice>();

    for (const price of prices) {
      if (price.customerId !== customerId || !price.active) {
        continue;
      }

      if (priceByProductId.has(price.productId)) {
        throw new Error(
          'Commercial catalog price configuration is inconsistent',
        );
      }

      priceByProductId.set(price.productId, price);
    }
    const items: CatalogItem[] = [];

    for (const product of products) {
      const price = priceByProductId.get(product.id);

      if (price !== undefined) {
        items.push(createCatalogItem(product, price));
      }
    }

    return Object.freeze(items);
  }
}
