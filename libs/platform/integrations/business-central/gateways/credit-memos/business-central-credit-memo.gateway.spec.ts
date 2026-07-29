import {
  StandardApiBusinessCentralCreditMemoGateway as PublicGateway,
  type BusinessCentralCreditMemoGateway,
  type BusinessCentralHttpClient,
} from '../../../../index';
import { StandardApiBusinessCentralCreditMemoGateway } from './business-central-credit-memo.gateway';

const SELECT = [
  'id',
  'number',
  'customerId',
  'customerNumber',
  'creditMemoDate',
  'currencyCode',
  'totalAmountIncludingTax',
  'status',
] as const;

const creditMemoRecord = Object.freeze({
  id: 'credit-memo-id',
  number: 'CM-100',
  customerId: 'customer-id',
  customerNumber: 'C-100',
  creditMemoDate: '2026-07-02',
  currencyCode: 'USD',
  totalAmountIncludingTax: 40,
  status: 'Open',
});

function createClient(): jest.Mocked<BusinessCentralHttpClient> {
  return {
    getOne: jest.fn(),
    query: jest.fn(),
  };
}

describe('StandardApiBusinessCentralCreditMemoGateway', () => {
  it('constructs without I/O and is publicly exported', () => {
    const client = createClient();
    const gateway: BusinessCentralCreditMemoGateway =
      new StandardApiBusinessCentralCreditMemoGateway(client);

    expect(gateway).toBeInstanceOf(PublicGateway);
    expect(client.getOne).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('findById maps a valid credit memo and freezes it', async () => {
    const client = createClient();
    client.getOne.mockResolvedValue(creditMemoRecord);
    const gateway = new StandardApiBusinessCentralCreditMemoGateway(client);

    const result = await gateway.findById('credit-memo-id');

    expect(client.getOne).toHaveBeenCalledWith(
      `salesCreditMemos(credit-memo-id)?$select=${SELECT.join(',')}`,
    );
    expect(result).toEqual({
      id: 'credit-memo-id',
      number: 'CM-100',
      customerId: 'customer-id',
      customerNumber: 'C-100',
      creditMemoDate: new Date('2026-07-02'),
      currencyCode: 'USD',
      totalAmount: 40,
      status: 'Open',
    });
    expect(result).not.toHaveProperty('remainingAmount');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('findById returns null', async () => {
    const client = createClient();
    client.getOne.mockResolvedValue(null);
    const gateway = new StandardApiBusinessCentralCreditMemoGateway(client);

    await expect(gateway.findById('missing-id')).resolves.toBeNull();
  });

  it('findByCustomer filters by customerId with a minimal select', async () => {
    const client = createClient();
    client.query.mockResolvedValue([creditMemoRecord]);
    const gateway = new StandardApiBusinessCentralCreditMemoGateway(client);

    const result = await gateway.findByCustomer(' customer-id ');

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('salesCreditMemos', {
      select: SELECT,
      filter: { customerId: 'customer-id' },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it.each([
    [{ ...creditMemoRecord, customerId: '' }],
    [{ ...creditMemoRecord, creditMemoDate: 'invalid' }],
    [
      {
        ...creditMemoRecord,
        totalAmountIncludingTax: Number.NEGATIVE_INFINITY,
      },
    ],
  ])('rejects an incomplete or invalid record', async (record) => {
    const client = createClient();
    client.getOne.mockResolvedValue(record);
    const gateway = new StandardApiBusinessCentralCreditMemoGateway(client);

    await expect(gateway.findById('credit-memo-id')).rejects.toThrow(
      /^Invalid Business Central sales credit memo record:/,
    );
  });

  it('propagates the exact client error', async () => {
    const client = createClient();
    const error = new Error('client failure');
    client.getOne.mockRejectedValue(error);
    const gateway = new StandardApiBusinessCentralCreditMemoGateway(client);

    await expect(gateway.findById('credit-memo-id')).rejects.toBe(error);
  });

  it('does not modify the physical record', async () => {
    const client = createClient();
    client.getOne.mockResolvedValue(creditMemoRecord);
    const gateway = new StandardApiBusinessCentralCreditMemoGateway(client);
    const original = { ...creditMemoRecord };

    await gateway.findById('credit-memo-id');

    expect(creditMemoRecord).toEqual(original);
  });
});
