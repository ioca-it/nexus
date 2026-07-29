import type {
  BusinessCentralInvoice,
  BusinessCentralInvoiceGateway,
} from '@nexus/platform';
import {
  BusinessCentralInvoiceRepository,
  createBusinessCentralCustomerId,
  createFinanceInvoiceId,
} from '../../index';

const source: BusinessCentralInvoice = Object.freeze({
  id: 'invoice-id',
  number: 'INV-100',
  customerId: 'bc-customer-id',
  invoiceDate: Object.freeze(new Date('2026-07-01')),
  totalAmount: 100,
});

function createGateway(): jest.Mocked<BusinessCentralInvoiceGateway> {
  return {
    findById: jest.fn(),
    findByCustomer: jest.fn(),
  };
}

describe('BusinessCentralInvoiceRepository', () => {
  it('delegates findById once and maps the invoice', async () => {
    const gateway = createGateway();
    gateway.findById.mockResolvedValue(source);
    const repository = new BusinessCentralInvoiceRepository(gateway);
    const id = createFinanceInvoiceId('invoice-id');

    const result = await repository.findById(id);

    expect(gateway.findById).toHaveBeenCalledTimes(1);
    expect(gateway.findById).toHaveBeenCalledWith(id);
    expect(result).toMatchObject({
      id: 'invoice-id',
      businessCentralCustomerId: 'bc-customer-id',
    });
  });

  it('returns null when the gateway returns null', async () => {
    const gateway = createGateway();
    gateway.findById.mockResolvedValue(null);
    const repository = new BusinessCentralInvoiceRepository(gateway);

    await expect(
      repository.findById(createFinanceInvoiceId('missing-id')),
    ).resolves.toBeNull();
  });

  it('delegates customer lookup once and returns a frozen mapped collection', async () => {
    const gateway = createGateway();
    gateway.findByCustomer.mockResolvedValue(Object.freeze([source]));
    const repository = new BusinessCentralInvoiceRepository(gateway);
    const customerId = createBusinessCentralCustomerId('bc-customer-id');

    const result = await repository.findByBusinessCentralCustomerId(customerId);

    expect(gateway.findByCustomer).toHaveBeenCalledTimes(1);
    expect(gateway.findByCustomer).toHaveBeenCalledWith(customerId);
    expect(result).toHaveLength(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it('propagates the exact gateway error', async () => {
    const gateway = createGateway();
    const error = new Error('gateway failed');
    gateway.findByCustomer.mockRejectedValue(error);
    const repository = new BusinessCentralInvoiceRepository(gateway);

    await expect(
      repository.findByBusinessCentralCustomerId(
        createBusinessCentralCustomerId('bc-customer-id'),
      ),
    ).rejects.toBe(error);
  });

  it('does not modify identifiers or gateway collections', async () => {
    const gateway = createGateway();
    const sources = Object.freeze([source]);
    gateway.findByCustomer.mockResolvedValue(sources);
    const repository = new BusinessCentralInvoiceRepository(gateway);
    const customerId = createBusinessCentralCustomerId('bc-customer-id');

    await repository.findByBusinessCentralCustomerId(customerId);

    expect(customerId).toBe('bc-customer-id');
    expect(sources).toEqual([source]);
    expect(sources[0]).toBe(source);
  });
});
