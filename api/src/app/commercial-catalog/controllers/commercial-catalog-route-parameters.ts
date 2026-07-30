import { BadRequestException } from '@nestjs/common';
import type { CatalogProductId } from '@nexus/modules/commercial-catalog';

export function normalizeCommercialCatalogProductId(
  productId: string,
): CatalogProductId {
  const normalized = productId?.trim();

  if (!normalized) {
    throw new BadRequestException('Commercial Catalog product id is required.');
  }

  return normalized as CatalogProductId;
}
