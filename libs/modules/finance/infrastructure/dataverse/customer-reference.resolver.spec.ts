import {
  createNexusCustomerId,
  DataverseCustomerBusinessCentralReferenceResolver,
  type FinanceCustomerReferenceGateway,
} from '../../index';

function createGateway(): jest.Mocked<FinanceCustomerReferenceGateway> {
  return {
    findByNexusCustomerId: jest.fn(),
  };
}

describe('DataverseCustomerBusinessCentralReferenceResolver', () => {
  it('resolves and normalizes a valid Business Central reference', async () => {
    const gateway = createGateway();
    gateway.findByNexusCustomerId.mockResolvedValue(
      Object.freeze({
        nexusCustomerId: 'nexus-customer-id',
        businessCentralCustomerId: ' bc-customer-id ',
        active: true,
      }),
    );
    const resolver = new DataverseCustomerBusinessCentralReferenceResolver(
      gateway,
    );

    await expect(
      resolver.resolveByNexusCustomerId(
        createNexusCustomerId('nexus-customer-id'),
      ),
    ).resolves.toBe('bc-customer-id');
    expect(gateway.findByNexusCustomerId).toHaveBeenCalledTimes(1);
  });

  it('returns null without applying an identifier fallback', async () => {
    const gateway = createGateway();
    gateway.findByNexusCustomerId.mockResolvedValue(null);
    const resolver = new DataverseCustomerBusinessCentralReferenceResolver(
      gateway,
    );
    const nexusCustomerId = createNexusCustomerId('same-looking-id');

    await expect(
      resolver.resolveByNexusCustomerId(nexusCustomerId),
    ).resolves.toBeNull();
    expect(gateway.findByNexusCustomerId).toHaveBeenCalledWith(nexusCustomerId);
  });

  it('normalizes input without modifying it', async () => {
    const gateway = createGateway();
    gateway.findByNexusCustomerId.mockResolvedValue(null);
    const resolver = new DataverseCustomerBusinessCentralReferenceResolver(
      gateway,
    );
    const input = '  nexus-customer-id  ';

    await resolver.resolveByNexusCustomerId(
      input as ReturnType<typeof createNexusCustomerId>,
    );

    expect(input).toBe('  nexus-customer-id  ');
    expect(gateway.findByNexusCustomerId).toHaveBeenCalledWith(
      'nexus-customer-id',
    );
  });

  it('propagates technical gateway errors unchanged', async () => {
    const gateway = createGateway();
    const error = new Error('gateway failed');
    gateway.findByNexusCustomerId.mockRejectedValue(error);
    const resolver = new DataverseCustomerBusinessCentralReferenceResolver(
      gateway,
    );

    await expect(
      resolver.resolveByNexusCustomerId(
        createNexusCustomerId('nexus-customer-id'),
      ),
    ).rejects.toBe(error);
  });
});
