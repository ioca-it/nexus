import {
  createNexusCustomerId,
  DataverseFinanceCustomerReferenceGateway,
  type DataverseFinanceCustomerReferenceSchema,
  type DataverseFinanceQueryClient,
} from '../../index';

const schema: DataverseFinanceCustomerReferenceSchema = Object.freeze({
  customerEntitySet: 'configured_customer_entity_set',
  customerFields: Object.freeze({
    nexusCustomerId: 'configured_nexus_customer_id',
    businessCentralCustomerId: 'configured_bc_customer_id',
    active: 'configured_active',
  }),
});

const activeRecord = Object.freeze({
  configured_nexus_customer_id: ' nexus-customer-id ',
  configured_bc_customer_id: ' bc-customer-id ',
  configured_active: true,
  unused_physical_field: 'must-not-be-returned',
});

function createClient(
  records: readonly Readonly<Record<string, unknown>>[] = [activeRecord],
): jest.Mocked<DataverseFinanceQueryClient> {
  return {
    query: jest.fn().mockResolvedValue(records),
  };
}

describe('DataverseFinanceCustomerReferenceGateway', () => {
  it('returns a frozen normalized active reference', async () => {
    const client = createClient();
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client,
      schema,
    });

    const result = await gateway.findByNexusCustomerId(
      createNexusCustomerId('nexus-customer-id'),
    );

    expect(result).toEqual({
      nexusCustomerId: 'nexus-customer-id',
      businessCentralCustomerId: 'bc-customer-id',
      active: true,
    });
    expect(result).not.toHaveProperty('unused_physical_field');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('uses the configured entity set and field name in exactly one query', async () => {
    const client = createClient();
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client,
      schema,
    });

    await gateway.findByNexusCustomerId(
      createNexusCustomerId('nexus-customer-id'),
    );

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(
      'configured_customer_entity_set',
      {
        configured_nexus_customer_id: 'nexus-customer-id',
      },
    );
    expect(Object.isFrozen(client.query.mock.calls[0][1])).toBe(true);
  });

  it('returns null for no record or an inactive record', async () => {
    const missingGateway = new DataverseFinanceCustomerReferenceGateway({
      client: createClient([]),
      schema,
    });
    const inactiveGateway = new DataverseFinanceCustomerReferenceGateway({
      client: createClient([
        Object.freeze({
          ...activeRecord,
          configured_active: false,
        }),
      ]),
      schema,
    });
    const id = createNexusCustomerId('nexus-customer-id');

    await expect(missingGateway.findByNexusCustomerId(id)).resolves.toBeNull();
    await expect(inactiveGateway.findByNexusCustomerId(id)).resolves.toBeNull();
  });

  it('rejects multiple records as an inconsistency', async () => {
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client: createClient([activeRecord, activeRecord]),
      schema,
    });

    await expect(
      gateway.findByNexusCustomerId(createNexusCustomerId('nexus-customer-id')),
    ).rejects.toThrow(
      'Dataverse returned multiple Finance customer references for the same NEXUS customer',
    );
  });

  it('rejects an empty Business Central customer reference', async () => {
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client: createClient([
        Object.freeze({
          ...activeRecord,
          configured_bc_customer_id: '   ',
        }),
      ]),
      schema,
    });

    await expect(
      gateway.findByNexusCustomerId(createNexusCustomerId('nexus-customer-id')),
    ).rejects.toThrow('Invalid Dataverse Finance customer reference record');
  });

  it.each([
    ['configured_nexus_customer_id', 100],
    ['configured_bc_customer_id', 100],
    ['configured_active', 'true'],
  ])('rejects an invalid physical type for %s', async (fieldName, value) => {
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client: createClient([
        Object.freeze({
          ...activeRecord,
          [fieldName]: value,
        }),
      ]),
      schema,
    });

    await expect(
      gateway.findByNexusCustomerId(createNexusCustomerId('nexus-customer-id')),
    ).rejects.toThrow(`"${fieldName}"`);
  });

  it('validates and normalizes the input before querying', async () => {
    const client = createClient();
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client,
      schema,
    });

    await gateway.findByNexusCustomerId(
      '  nexus-customer-id  ' as ReturnType<typeof createNexusCustomerId>,
    );

    expect(client.query).toHaveBeenCalledWith(expect.any(String), {
      configured_nexus_customer_id: 'nexus-customer-id',
    });

    await expect(
      gateway.findByNexusCustomerId(
        '   ' as ReturnType<typeof createNexusCustomerId>,
      ),
    ).rejects.toThrow('NEXUS customer id is required');
  });

  it('does not modify the physical response', async () => {
    const records = Object.freeze([activeRecord]);
    const client = createClient(records);
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client,
      schema,
    });
    const snapshot = { ...activeRecord };

    await gateway.findByNexusCustomerId(
      createNexusCustomerId('nexus-customer-id'),
    );

    expect(activeRecord).toEqual(snapshot);
    expect(records[0]).toBe(activeRecord);
  });

  it('propagates technical query errors unchanged', async () => {
    const error = new Error('query failed');
    const client = createClient();
    client.query.mockRejectedValue(error);
    const gateway = new DataverseFinanceCustomerReferenceGateway({
      client,
      schema,
    });

    await expect(
      gateway.findByNexusCustomerId(createNexusCustomerId('nexus-customer-id')),
    ).rejects.toBe(error);
  });
});
