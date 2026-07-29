import type {
  BusinessCentralCreditMemo,
  BusinessCentralInvoice,
} from '@nexus/platform';
import { toCreditMemo, toInvoice } from '../../../index';

const invoiceSource: BusinessCentralInvoice = Object.freeze({
  id: ' invoice-id ',
  number: ' INV-100 ',
  customerId: ' bc-customer-id ',
  customerNumber: ' C-100 ',
  invoiceDate: Object.freeze(new Date('2026-07-01T00:00:00Z')),
  dueDate: Object.freeze(new Date('2026-08-01T00:00:00Z')),
  currencyCode: ' USD ',
  totalAmount: 125,
  remainingAmount: 25,
  status: ' Open ',
});

const creditMemoSource: BusinessCentralCreditMemo = Object.freeze({
  id: ' credit-memo-id ',
  number: ' CM-100 ',
  customerId: ' bc-customer-id ',
  customerNumber: ' C-100 ',
  creditMemoDate: Object.freeze(new Date('2026-07-02T00:00:00Z')),
  currencyCode: ' USD ',
  totalAmount: 40,
  remainingAmount: 10,
  status: ' Open ',
});

describe('Business Central Finance mappers', () => {
  it('maps a valid invoice through the domain factory', () => {
    const invoice = toInvoice(invoiceSource);

    expect(invoice).toEqual({
      id: 'invoice-id',
      number: 'INV-100',
      businessCentralCustomerId: 'bc-customer-id',
      customerNumber: 'C-100',
      invoiceDate: new Date('2026-07-01T00:00:00Z'),
      dueDate: new Date('2026-08-01T00:00:00Z'),
      currencyCode: 'USD',
      totalAmount: 125,
      remainingAmount: 25,
      status: 'Open',
    });
    expect(Object.isFrozen(invoice)).toBe(true);
  });

  it('maps a valid credit memo through the domain factory', () => {
    const creditMemo = toCreditMemo(creditMemoSource);

    expect(creditMemo).toEqual({
      id: 'credit-memo-id',
      number: 'CM-100',
      businessCentralCustomerId: 'bc-customer-id',
      customerNumber: 'C-100',
      creditMemoDate: new Date('2026-07-02T00:00:00Z'),
      currencyCode: 'USD',
      totalAmount: 40,
      remainingAmount: 10,
      status: 'Open',
    });
    expect(Object.isFrozen(creditMemo)).toBe(true);
  });

  it('copies dates defensively', () => {
    const invoice = toInvoice(invoiceSource);
    const creditMemo = toCreditMemo(creditMemoSource);

    expect(invoice.invoiceDate).not.toBe(invoiceSource.invoiceDate);
    expect(invoice.dueDate).not.toBe(invoiceSource.dueDate);
    expect(creditMemo.creditMemoDate).not.toBe(creditMemoSource.creditMemoDate);
    expect(invoice.invoiceDate.getTime()).toBe(
      invoiceSource.invoiceDate.getTime(),
    );
  });

  it('does not infer absent optional fields', () => {
    const invoice = toInvoice({
      id: 'invoice-id',
      number: 'INV-100',
      customerId: 'bc-customer-id',
      invoiceDate: new Date('2026-07-01'),
      totalAmount: 100,
    });
    const creditMemo = toCreditMemo({
      id: 'credit-memo-id',
      number: 'CM-100',
      customerId: 'bc-customer-id',
      creditMemoDate: new Date('2026-07-02'),
      totalAmount: 25,
    });

    expect(invoice).not.toHaveProperty('remainingAmount');
    expect(invoice).not.toHaveProperty('dueDate');
    expect(creditMemo).not.toHaveProperty('remainingAmount');
    expect(creditMemo).not.toHaveProperty('status');
  });

  it('does not modify source records', () => {
    const invoiceSnapshot = { ...invoiceSource };
    const creditMemoSnapshot = { ...creditMemoSource };

    toInvoice(invoiceSource);
    toCreditMemo(creditMemoSource);

    expect(invoiceSource).toEqual(invoiceSnapshot);
    expect(creditMemoSource).toEqual(creditMemoSnapshot);
  });
});
