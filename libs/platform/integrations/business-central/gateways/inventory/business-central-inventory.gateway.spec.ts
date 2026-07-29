import type {
  BusinessCentralInventoryGateway,
  BusinessCentralInventoryItem,
} from '../../../../index';

describe('BusinessCentralInventoryGateway contract', () => {
  it('contains only inventory data and readonly lookup operations', async () => {
    const item: BusinessCentralInventoryItem = Object.freeze({
      itemId: 'item-id',
      itemNumber: 'ITEM-100',
      availableQuantity: 8,
      inventoryQuantity: 10,
      unitOfMeasureCode: 'PCS',
      lastModifiedAt: Object.freeze(new Date('2026-07-01T12:00:00Z')),
    });
    const gateway: BusinessCentralInventoryGateway = {
      findByItemId: jest.fn().mockResolvedValue(item),
      findByItemIds: jest.fn().mockResolvedValue(Object.freeze([item])),
    };

    await expect(gateway.findByItemId('item-id')).resolves.toBe(item);
    await expect(gateway.findByItemIds(['item-id'])).resolves.toEqual([item]);
    expect(item).not.toHaveProperty('name');
    expect(item).not.toHaveProperty('description');
    expect(item).not.toHaveProperty('price');
    expect(Object.isFrozen(item)).toBe(true);
  });

  it('does not expose an implementation that equates inventory with availability', async () => {
    const module = await import('./business-central-inventory.gateway');

    expect(Object.keys(module)).toEqual([]);
  });
});
