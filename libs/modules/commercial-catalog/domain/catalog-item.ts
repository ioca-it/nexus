import type { CustomerPrice } from './customer-price';
import type { CatalogProduct } from './product';

export interface CatalogItem {
  readonly product: CatalogProduct;
  readonly price: CustomerPrice;
}

export function createCatalogItem(
  product: CatalogProduct,
  price: CustomerPrice,
): CatalogItem {
  if (price.productId !== product.id) {
    throw new Error('Catalog item product and price do not match');
  }

  return Object.freeze({ product, price });
}
