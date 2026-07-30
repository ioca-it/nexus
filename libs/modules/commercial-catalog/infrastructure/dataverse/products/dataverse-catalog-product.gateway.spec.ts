import { createCatalogProductId } from '../../../domain';
import type { CommercialCatalogDataverseClient } from '../common';
import {
  DataverseCatalogProductGateway,
  type DataverseCatalogProductGatewayDependencies,
} from './dataverse-catalog-product.gateway';

const schema = Object.freeze({
  entitySet: 'configured_products',
  fields: Object.freeze({
    id: 'configured_id',
    number: 'configured_number',
    name: 'configured_name',
    description: 'configured_description',
    categoryId: 'configured_category',
    imageReference: 'configured_image',
    unitOfMeasureCode: 'configured_uom',
    active: 'configured_active',
  }),
});

const activePhysicalRecord = Object.freeze({
  configured_id: ' product-1 ',
  configured_number: ' P-001 ',
  configured_name: ' Product one ',
  configured_description: ' Description ',
  configured_category: ' Category ',
  configured_image: ' Image ',
  configured_uom: ' EA ',
  configured_active: true,
  unused_price: 99,
});

function setup(
  overrides: Partial<jest.Mocked<CommercialCatalogDataverseClient>> = {},
) {
  const client: jest.Mocked<CommercialCatalogDataverseClient> = {
    findOne: jest.fn().mockResolvedValue(activePhysicalRecord),
    query: jest.fn().mockResolvedValue([activePhysicalRecord]),
    ...overrides,
  };
  const dependencies: DataverseCatalogProductGatewayDependencies = {
    client,
    schema,
  };

  return {
    client,
    gateway: new DataverseCatalogProductGateway(dependencies),
  };
}

describe('DataverseCatalogProductGateway', () => {
  it('findById returns a normalized frozen record using configured fields', async () => {
    const { gateway } = setup();

    const result = await gateway.findById(
      createCatalogProductId(' product-1 '),
    );

    expect(result).toEqual({
      id: 'product-1',
      number: 'P-001',
      name: 'Product one',
      description: 'Description',
      categoryId: 'Category',
      imageReference: 'Image',
      unitOfMeasureCode: 'EA',
      active: true,
    });
    expect(result).not.toHaveProperty('unused_price');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('findById executes findOne exactly once and returns null when absent', async () => {
    const { client, gateway } = setup({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      gateway.findById(createCatalogProductId('product-1')),
    ).resolves.toBeNull();
    expect(client.findOne).toHaveBeenCalledTimes(1);
    expect(client.findOne).toHaveBeenCalledWith(
      'configured_products',
      'product-1',
    );
    expect(client.query).not.toHaveBeenCalled();
  });

  it('findActive uses the configured active filter once and freezes results', async () => {
    const inactive = Object.freeze({
      ...activePhysicalRecord,
      configured_id: 'product-2',
      configured_active: false,
    });
    const { client, gateway } = setup({
      query: jest.fn().mockResolvedValue([activePhysicalRecord, inactive]),
    });

    const result = await gateway.findActive();

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('configured_products', {
      configured_active: true,
    });
    expect(Object.isFrozen(client.query.mock.calls[0]?.[1])).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('product-1');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ['configured_id', '   '],
    ['configured_number', undefined],
    ['configured_name', 100],
    ['configured_active', 'true'],
  ])('rejects an invalid configured field %s', async (fieldName, value) => {
    const { gateway } = setup({
      findOne: jest.fn().mockResolvedValue({
        ...activePhysicalRecord,
        [fieldName]: value,
      }),
    });

    await expect(
      gateway.findById(createCatalogProductId('product-1')),
    ).rejects.toThrow(`"${fieldName}"`);
  });

  it('normalizes empty optional strings to undefined without modifying input', async () => {
    const physicalRecord = Object.freeze({
      ...activePhysicalRecord,
      configured_description: '   ',
      configured_category: undefined,
    });
    const snapshot = { ...physicalRecord };
    const { gateway } = setup({
      findOne: jest.fn().mockResolvedValue(physicalRecord),
    });

    const result = await gateway.findById(createCatalogProductId('product-1'));

    expect(result).not.toHaveProperty('description');
    expect(result).not.toHaveProperty('categoryId');
    expect(physicalRecord).toEqual(snapshot);
  });

  it('propagates client errors unchanged', async () => {
    const failure = new Error('Dataverse unavailable');
    const { gateway } = setup({
      query: jest.fn().mockRejectedValue(failure),
    });

    await expect(gateway.findActive()).rejects.toBe(failure);
  });
});
