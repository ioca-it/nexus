import type {
  BusinessCentralReceivable,
  BusinessCentralReceivableGateway,
} from '../../../../index';

describe('BusinessCentralReceivableGateway contract', () => {
  it('is a readonly normalized contract pending a custom API page', () => {
    const receivable: BusinessCentralReceivable = Object.freeze({
      id: 'entry-id',
      customerId: 'customer-id',
      documentType: 'Invoice',
      documentNumber: 'INV-100',
      postingDate: Object.freeze(new Date('2026-07-01')),
      dueDate: Object.freeze(new Date('2026-08-01')),
      originalAmount: 100,
      remainingAmount: 25,
      currencyCode: 'USD',
      open: true,
    });
    const gateway: BusinessCentralReceivableGateway = {
      findOpenByCustomer: jest
        .fn()
        .mockResolvedValue(Object.freeze([receivable])),
    };

    expect(gateway.findOpenByCustomer('customer-id')).resolves.toEqual([
      receivable,
    ]);
    expect(Object.isFrozen(receivable)).toBe(true);
  });

  it('does not expose an invented standard API implementation', async () => {
    const module = await import('./business-central-receivable.gateway');

    expect(Object.keys(module)).toEqual([]);
  });
});
