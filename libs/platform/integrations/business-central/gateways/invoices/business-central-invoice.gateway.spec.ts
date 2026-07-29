import {
  StandardApiBusinessCentralInvoiceGateway as PublicGateway,
  type BusinessCentralHttpClient,
  type BusinessCentralInvoiceGateway,
} from '../../../../index';
import { StandardApiBusinessCentralInvoiceGateway } from './business-central-invoice.gateway';

const SELECT = [
  'id',
  'number',
  'customerId',
  'customerNumber',
  'invoiceDate',
  'dueDate',
  'currencyCode',
  'totalAmountIncludingTax',
  'remainingAmount',
  'status',
] as const;

const invoiceRecord = Object.freeze({
  id: 'invoice-id',
  number: 'INV-100',
  customerId: 'customer-id',
  customerNumber: 'C-100',
  invoiceDate: '2026-07-01',
  dueDate: '2026-08-01',
  currencyCode: 'USD',
  totalAmountIncludingTax: 125.5,
  remainingAmount: 25.5,
  status: 'Open',
});

function createClient(): jest.Mocked<BusinessCentralHttpClient> {
  return {
    getOne: jest.fn(),
    query: jest.fn(),
  };
}

describe('StandardApiBusinessCentralInvoiceGateway', () => {
  it('constructs without I/O and is publicly exported', () => {
    const client = createClient();
    const gateway: BusinessCentralInvoiceGateway =
      new StandardApiBusinessCentralInvoiceGateway(client);

    expect(gateway).toBeInstanceOf(PublicGateway);
    expect(client.getOne).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('findById maps a valid invoice with optional fields', async () => {
    const client = createClient();
    client.getOne.mockResolvedValue(invoiceRecord);
    const gateway = new StandardApiBusinessCentralInvoiceGateway(client);

    const result = await gateway.findById(' invoice-id ');

    expect(client.getOne).toHaveBeenCalledWith(
      `salesInvoices(invoice-id)?$select=${SELECT.join(',')}`,
    );
    expect(result).toEqual({
      id: 'invoice-id',
      number: 'INV-100',
      customerId: 'customer-id',
      customerNumber: 'C-100',
      invoiceDate: new Date('2026-07-01'),
      dueDate: new Date('2026-08-01'),
      currencyCode: 'USD',
      totalAmount: 125.5,
      remainingAmount: 25.5,
      status: 'Open',
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.invoiceDate)).toBe(true);
  });

  it('findById returns null without mapping', async () => {
    const client = createClient();
    client.getOne.mockResolvedValue(null);
    const gateway = new StandardApiBusinessCentralInvoiceGateway(client);

    await expect(gateway.findById('missing-id')).resolves.toBeNull();
  });

  it('findByCustomer uses one filtered query and freezes the collection', async () => {
    const client = createClient();
    client.query.mockResolvedValue([invoiceRecord]);
    const gateway = new StandardApiBusinessCentralInvoiceGateway(client);

    const result = await gateway.findByCustomer(' customer-id ');

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith('salesInvoices', {
      select: SELECT,
      filter: { customerId: 'customer-id' },
    });
    expect(result).toHaveLength(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it.each([
    ['missing required field', { ...invoiceRecord, number: undefined }],
    ['invalid date', { ...invoiceRecord, invoiceDate: '2026-02-30' }],
    ['invalid optional date', { ...invoiceRecord, dueDate: 'not-a-date' }],
    ['NaN total', { ...invoiceRecord, totalAmountIncludingTax: Number.NaN }],
    [
      'infinite remaining amount',
      { ...invoiceRecord, remainingAmount: Infinity },
    ],
  ])('rejects an invalid record: %s', async (_name, record) => {
    const client = createClient();
    client.getOne.mockResolvedValue(record);
    const gateway = new StandardApiBusinessCentralInvoiceGateway(client);

    await expect(gateway.findById('invoice-id')).rejects.toThrow(
      /^Invalid Business Central sales invoice record:/,
    );
  });

  it('propagates the exact client error', async () => {
    const client = createClient();
    const error = new Error('client failure');
    client.query.mockRejectedValue(error);
    const gateway = new StandardApiBusinessCentralInvoiceGateway(client);

    await expect(gateway.findByCustomer('customer-id')).rejects.toBe(error);
  });

  it('does not modify lookup values or physical records', async () => {
    const client = createClient();
    const records = Object.freeze([invoiceRecord]);
    client.query.mockResolvedValue(records);
    const gateway = new StandardApiBusinessCentralInvoiceGateway(client);
    const customerId = 'customer-id';
    const originalRecord = { ...invoiceRecord };

    await gateway.findByCustomer(customerId);

    expect(customerId).toBe('customer-id');
    expect(invoiceRecord).toEqual(originalRecord);
    expect(records[0]).toBe(invoiceRecord);
  });

  it('rejects empty lookup identifiers without I/O', async () => {
    const client = createClient();
    const gateway = new StandardApiBusinessCentralInvoiceGateway(client);

    await expect(gateway.findById('   ')).rejects.toThrow('id is required');
    await expect(gateway.findByCustomer('')).rejects.toThrow(
      'customerId is required',
    );
    expect(client.getOne).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });
});
