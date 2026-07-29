export interface BusinessCentralInventoryItem {
  readonly itemId: string;
  readonly itemNumber: string;
  readonly availableQuantity: number;
  readonly inventoryQuantity?: number;
  readonly unitOfMeasureCode?: string;
  readonly lastModifiedAt?: Date;
}

export interface BusinessCentralInventoryGateway {
  findByItemId(itemId: string): Promise<BusinessCentralInventoryItem | null>;

  findByItemIds(
    itemIds: readonly string[],
  ): Promise<readonly BusinessCentralInventoryItem[]>;
}
