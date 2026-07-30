import type { AuthenticatedActor } from '@nexus/platform';
import {
  createCatalogItem,
  type CatalogItem,
  type CatalogProductId,
  type CatalogProductRepository,
  type CustomerPriceRepository,
} from '../../domain';
import type { CatalogClock } from '../catalog-clock';
import { COMMERCIAL_CATALOG_PERMISSION_ACTIONS } from '../security';
import {
  assertCommercialCatalogPermission,
  requireCatalogCustomerId,
} from './commercial-catalog-access';

export interface GetCustomerCatalogItemRequest {
  readonly actor: AuthenticatedActor;
  readonly productId: CatalogProductId;
}

export interface GetCustomerCatalogItemDependencies {
  readonly productRepository: CatalogProductRepository;
  readonly customerPriceRepository: CustomerPriceRepository;
  readonly clock: CatalogClock;
}

export class GetCustomerCatalogItemUseCase {
  constructor(
    private readonly dependencies: GetCustomerCatalogItemDependencies,
  ) {}

  async execute(
    request: GetCustomerCatalogItemRequest,
  ): Promise<CatalogItem | null> {
    assertCommercialCatalogPermission(
      request.actor,
      COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_PRODUCT,
    );
    const customerId = requireCatalogCustomerId(request.actor);
    const asOf = this.dependencies.clock();
    const product = await this.dependencies.productRepository.findById(
      request.productId,
    );

    if (product === null || !product.active) {
      return null;
    }

    const price =
      await this.dependencies.customerPriceRepository.findActiveByCustomerAndProduct(
        customerId,
        product.id,
        asOf,
      );

    if (price === null || !price.active || price.customerId !== customerId) {
      return null;
    }

    return createCatalogItem(product, price);
  }
}
