import {
  createCatalogCustomerId,
  createCatalogProductId,
  type CatalogCustomerId,
  type CatalogProductId,
} from '../../../domain';
import {
  requireValidAsOf,
  validateCustomerPriceRecord,
  type CommercialCatalogDataverseClient,
  type CustomerPriceRecord,
  type DataverseCustomerPriceSchema,
} from '../common';
import type { CustomerPriceGateway } from './customer-price.gateway';

export interface DataverseCustomerPriceGatewayDependencies {
  readonly client: CommercialCatalogDataverseClient;
  readonly schema: DataverseCustomerPriceSchema;
}

export class DataverseCustomerPriceGateway implements CustomerPriceGateway {
  constructor(
    private readonly dependencies: DataverseCustomerPriceGatewayDependencies,
  ) {}

  async findActiveByCustomerId(
    customerId: CatalogCustomerId,
    asOf: Date,
  ): Promise<readonly CustomerPriceRecord[]> {
    const normalizedCustomerId = createCatalogCustomerId(customerId);

    return this.findEffective(
      normalizedCustomerId,
      undefined,
      requireValidAsOf(asOf),
    );
  }

  async findActiveByCustomerAndProduct(
    customerId: CatalogCustomerId,
    productId: CatalogProductId,
    asOf: Date,
  ): Promise<CustomerPriceRecord | null> {
    const normalizedCustomerId = createCatalogCustomerId(customerId);
    const normalizedProductId = createCatalogProductId(productId);
    const records = await this.findEffective(
      normalizedCustomerId,
      normalizedProductId,
      requireValidAsOf(asOf),
    );

    if (records.length > 1) {
      throw new Error(
        'Dataverse returned multiple effective Commercial Catalog prices for the same customer and product',
      );
    }

    return records[0] ?? null;
  }

  private async findEffective(
    customerId: CatalogCustomerId,
    productId: CatalogProductId | undefined,
    asOfTimestamp: number,
  ): Promise<readonly CustomerPriceRecord[]> {
    const { fields } = this.dependencies.schema;
    const filter = Object.freeze({
      [fields.customerId]: customerId,
      ...(productId === undefined ? {} : { [fields.productId]: productId }),
      [fields.active]: true,
    });
    const physicalRecords = await this.dependencies.client.query(
      this.dependencies.schema.entitySet,
      filter,
    );

    // Opti ChatGPT: filtrado de vigencia en una sola colección para evitar múltiples consultas Dataverse.
    const effectiveRecords = physicalRecords
      .map((record) => validateCustomerPriceRecord(record, fields))
      .filter(
        (record) =>
          record.customerId === customerId &&
          (productId === undefined || record.productId === productId) &&
          record.active &&
          isEffective(record, asOfTimestamp),
      );

    return Object.freeze(effectiveRecords);
  }
}

function isEffective(
  record: CustomerPriceRecord,
  asOfTimestamp: number,
): boolean {
  return (
    (record.validFrom === undefined ||
      new Date(record.validFrom).getTime() <= asOfTimestamp) &&
    (record.validTo === undefined ||
      new Date(record.validTo).getTime() >= asOfTimestamp)
  );
}
