import type { CatalogProductResponse } from './catalog-product.response';
import type { CustomerPriceResponse } from './customer-price.response';

export interface CatalogItemResponse {
  readonly product: CatalogProductResponse;
  readonly price: CustomerPriceResponse;
}
