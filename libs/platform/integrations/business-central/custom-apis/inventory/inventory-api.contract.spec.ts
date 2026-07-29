import { readFileSync } from 'node:fs';

import type {
  BusinessCentralInventoryItem,
  InventoryAvailabilityApiRecord,
} from '../../../../index';
import {
  createInventoryAvailabilityApiContract,
  INVENTORY_AVAILABILITY_API_FIELDS,
  INVENTORY_AVAILABILITY_API_REQUIRED_FILTERS,
  validateInventoryAvailabilityApiRecord,
} from './inventory-api.contract';

type RequiredKeys<T> = {
  [Key in keyof T]-?: object extends Pick<T, Key> ? never : Key;
}[keyof T];

type Assert<T extends true> = T;

const coversRequiredGatewayFields: Assert<
  Exclude<
    RequiredKeys<BusinessCentralInventoryItem>,
    keyof InventoryAvailabilityApiRecord
  > extends never
    ? true
    : false
> = true;

const metadata = Object.freeze({
  publisher: 'testPublisher',
  group: 'testGroup',
  version: 'v1.0',
  entityName: 'testInventoryAvailability',
  entitySetName: 'testInventoryAvailabilities',
});

function validRecord(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    itemId: 'item-id',
    itemNumber: 'ITEM-100',
    availableQuantity: 8,
    inventoryQuantity: 10,
    unitOfMeasureCode: 'PCS',
    lastModifiedDateTime: '2026-07-02T12:30:00.000Z',
  });
}

describe('Inventory availability custom API contract', () => {
  it('defines exact fields, item filter, grouped filtering, and read-only metadata', () => {
    const contract = createInventoryAvailabilityApiContract(metadata);

    expect(contract.fields).toEqual([
      'itemId',
      'itemNumber',
      'availableQuantity',
      'inventoryQuantity',
      'unitOfMeasureCode',
      'lastModifiedDateTime',
    ]);
    expect(contract.fields).toBe(INVENTORY_AVAILABILITY_API_FIELDS);
    expect(contract.requiredFilters).toEqual(['itemId']);
    expect(contract.requiredFilters).toBe(
      INVENTORY_AVAILABILITY_API_REQUIRED_FILTERS,
    );
    expect(contract.supportsGroupedItemFilter).toBe(true);
    expect(contract.readOnly).toBe(true);
    expect(contract.metadata).toEqual(metadata);
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.metadata)).toBe(true);
    expect(Object.isFrozen(contract.fields)).toBe(true);
    expect(Object.isFrozen(contract.requiredFilters)).toBe(true);
  });

  it('does not fix production routing metadata or expose commercial and financial fields', () => {
    const source = readFileSync(__filename.replace('.spec.ts', '.ts'), 'utf8');
    const forbiddenFields = [
      'name',
      'description',
      'category',
      'image',
      'price',
      'cost',
      'margin',
      'originalAmount',
      'remainingAmount',
      'currencyCode',
    ];

    expect(source).not.toMatch(
      /tenantId|environmentName|companyId|objectId|https?:\/\//,
    );
    for (const field of forbiddenFields) {
      expect(INVENTORY_AVAILABILITY_API_FIELDS).not.toContain(field);
    }
  });

  it('validates and freezes a complete record without modifying its input', () => {
    const record = validRecord();
    const before = JSON.stringify(record);

    const result = validateInventoryAvailabilityApiRecord(record);

    expect(result).toEqual(record);
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(record)).toBe(before);
  });

  it.each([
    ['itemId', ''],
    ['itemId', '   '],
    ['itemNumber', ''],
    ['itemNumber', '   '],
  ])('rejects an empty required identifier in %s', (fieldName, value) => {
    expect(() =>
      validateInventoryAvailabilityApiRecord({
        ...validRecord(),
        [fieldName]: value,
      }),
    ).toThrow(fieldName);
  });

  it.each([
    ['missing', undefined],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('rejects %s availableQuantity', (_caseName, value) => {
    const record = { ...validRecord(), availableQuantity: value };

    expect(() => validateInventoryAvailabilityApiRecord(record)).toThrow(
      'availableQuantity',
    );
  });

  it('preserves optional inventoryQuantity when present and omits it when absent', () => {
    const complete = validateInventoryAvailabilityApiRecord(validRecord());
    const minimal = validateInventoryAvailabilityApiRecord({
      itemId: 'item-id',
      itemNumber: 'ITEM-100',
      availableQuantity: 8,
    });

    expect(complete).toHaveProperty('inventoryQuantity', 10);
    expect(minimal).not.toHaveProperty('inventoryQuantity');
    expect(minimal).not.toHaveProperty('unitOfMeasureCode');
    expect(minimal).not.toHaveProperty('lastModifiedDateTime');
  });

  it('rejects a non-finite optional inventoryQuantity', () => {
    expect(() =>
      validateInventoryAvailabilityApiRecord({
        ...validRecord(),
        inventoryQuantity: Number.POSITIVE_INFINITY,
      }),
    ).toThrow('inventoryQuantity');
  });

  it.each(['not-a-date', '2026-02-30', '2026-07-01T25:00:00Z'])(
    'rejects invalid lastModifiedDateTime %s',
    (lastModifiedDateTime) => {
      expect(() =>
        validateInventoryAvailabilityApiRecord({
          ...validRecord(),
          lastModifiedDateTime,
        }),
      ).toThrow('lastModifiedDateTime');
    },
  );

  it('covers every required inventory gateway field without inference', () => {
    expect(coversRequiredGatewayFields).toBe(true);
    expect(INVENTORY_AVAILABILITY_API_FIELDS).toEqual(
      expect.arrayContaining(['itemId', 'itemNumber', 'availableQuantity']),
    );
  });
});
