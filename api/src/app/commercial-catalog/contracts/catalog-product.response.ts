export interface CatalogProductResponse {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly imageReference?: string;
  readonly unitOfMeasureCode?: string;
}
