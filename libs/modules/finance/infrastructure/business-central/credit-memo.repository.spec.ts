import type {
  BusinessCentralCreditMemo,
  BusinessCentralCreditMemoGateway,
} from '@nexus/platform';
import {
  BusinessCentralCreditMemoRepository,
  createBusinessCentralCustomerId,
  createFinanceCreditMemoId,
} from '../../index';

const source: BusinessCentralCreditMemo = Object.freeze({
  id: 'credit-memo-id',
  number: 'CM-100',
  customerId: 'bc-customer-id',
  creditMemoDate: Object.freeze(new Date('2026-07-02')),
  totalAmount: 40,
});

function createGateway(): jest.Mocked<BusinessCentralCreditMemoGateway> {
  return {
    findById: jest.fn(),
    findByCustomer: jest.fn(),
  };
}

describe('BusinessCentralCreditMemoRepository', () => {
  it('delegates findById once and maps the credit memo', async () => {
    const gateway = createGateway();
    gateway.findById.mockResolvedValue(source);
    const repository = new BusinessCentralCreditMemoRepository(gateway);
    const id = createFinanceCreditMemoId('credit-memo-id');

    const result = await repository.findById(id);

    expect(gateway.findById).toHaveBeenCalledTimes(1);
    expect(gateway.findById).toHaveBeenCalledWith(id);
    expect(result).toMatchObject({
      id: 'credit-memo-id',
      businessCentralCustomerId: 'bc-customer-id',
    });
  });

  it('returns null when the gateway returns null', async () => {
    const gateway = createGateway();
    gateway.findById.mockResolvedValue(null);
    const repository = new BusinessCentralCreditMemoRepository(gateway);

    await expect(
      repository.findById(createFinanceCreditMemoId('missing-id')),
    ).resolves.toBeNull();
  });

  it('delegates customer lookup once and freezes the mapped collection', async () => {
    const gateway = createGateway();
    gateway.findByCustomer.mockResolvedValue(Object.freeze([source]));
    const repository = new BusinessCentralCreditMemoRepository(gateway);
    const customerId = createBusinessCentralCustomerId('bc-customer-id');

    const result = await repository.findByBusinessCentralCustomerId(customerId);

    expect(gateway.findByCustomer).toHaveBeenCalledTimes(1);
    expect(gateway.findByCustomer).toHaveBeenCalledWith(customerId);
    expect(result).toHaveLength(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it('propagates errors unchanged and preserves the input', async () => {
    const gateway = createGateway();
    const error = new Error('gateway failed');
    gateway.findById.mockRejectedValue(error);
    const repository = new BusinessCentralCreditMemoRepository(gateway);
    const id = createFinanceCreditMemoId('credit-memo-id');

    await expect(repository.findById(id)).rejects.toBe(error);
    expect(id).toBe('credit-memo-id');
  });
});
