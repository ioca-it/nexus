import type { CatalogCustomerId, CatalogProductId } from '../catalog.types';
import type { CustomerPrice } from '../customer-price';

export interface CustomerPriceRepository {
  findActiveByCustomerId(
    customerId: CatalogCustomerId,
    asOf: Date,
  ): Promise<readonly CustomerPrice[]>;

  findActiveByCustomerAndProduct(
    customerId: CatalogCustomerId,
    productId: CatalogProductId,
    asOf: Date,
  ): Promise<CustomerPrice | null>;
}
