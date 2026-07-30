export type CommercialCatalogPhysicalRecord = Readonly<Record<string, unknown>>;

export interface CommercialCatalogDataverseClient {
  findOne(
    entitySet: string,
    id: string,
  ): Promise<CommercialCatalogPhysicalRecord | null>;

  query(
    entitySet: string,
    filter: CommercialCatalogPhysicalRecord,
  ): Promise<readonly CommercialCatalogPhysicalRecord[]>;
}

export interface CatalogProductRecord {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly imageReference?: string;
  readonly unitOfMeasureCode?: string;
  readonly ecommerceUrl?: string;
  readonly active: boolean;
}

export interface CustomerPriceRecord {
  readonly id: string;
  readonly customerId: string;
  readonly productId: string;
  readonly currencyCode: string;
  readonly unitPrice: number;
  readonly minimumQuantity?: number;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly active: boolean;
}

export interface DataverseCatalogProductSchema {
  readonly entitySet: string;
  readonly fields: {
    readonly id: string;
    readonly number: string;
    readonly name: string;
    readonly description: string;
    readonly categoryId: string;
    readonly imageReference: string;
    readonly unitOfMeasureCode: string;
    readonly ecommerceUrl: string;
    readonly active: string;
  };
}

export interface DataverseCustomerPriceSchema {
  readonly entitySet: string;
  readonly fields: {
    readonly id: string;
    readonly customerId: string;
    readonly productId: string;
    readonly currencyCode: string;
    readonly unitPrice: string;
    readonly minimumQuantity: string;
    readonly validFrom: string;
    readonly validTo: string;
    readonly active: string;
  };
}
