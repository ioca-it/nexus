import { createCatalogProductId, type CatalogProductId } from '../../../domain';
import {
  validateCatalogProductRecord,
  type CatalogProductRecord,
  type CommercialCatalogDataverseClient,
  type DataverseCatalogProductSchema,
} from '../common';
import type { CatalogProductGateway } from './catalog-product.gateway';

export interface DataverseCatalogProductGatewayDependencies {
  readonly client: CommercialCatalogDataverseClient;
  readonly schema: DataverseCatalogProductSchema;
}

export class DataverseCatalogProductGateway implements CatalogProductGateway {
  constructor(
    private readonly dependencies: DataverseCatalogProductGatewayDependencies,
  ) {}

  async findById(id: CatalogProductId): Promise<CatalogProductRecord | null> {
    const normalizedId = createCatalogProductId(id);
    const physicalRecord = await this.dependencies.client.findOne(
      this.dependencies.schema.entitySet,
      normalizedId,
    );

    return physicalRecord === null
      ? null
      : validateCatalogProductRecord(
          physicalRecord,
          this.dependencies.schema.fields,
        );
  }

  async findActive(): Promise<readonly CatalogProductRecord[]> {
    const { fields } = this.dependencies.schema;
    const physicalRecords = await this.dependencies.client.query(
      this.dependencies.schema.entitySet,
      Object.freeze({ [fields.active]: true }),
    );
    const records = physicalRecords
      .map((record) => validateCatalogProductRecord(record, fields))
      .filter((record) => record.active);

    return Object.freeze(records);
  }
}
