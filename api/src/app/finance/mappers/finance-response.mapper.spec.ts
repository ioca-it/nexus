import {
  createBusinessCentralCustomerId,
  createCreditMemo,
  createFinanceCreditMemoId,
  createFinanceInvoiceId,
  createInvoice,
} from '@nexus/modules/finance';

import {
  toFinanceCreditMemoResponse,
  toFinanceInvoiceResponse,
} from './finance-response.mapper';

describe('Finance response mappers', () => {
  it('maps every approved invoice field to a frozen HTTP response', () => {
    const invoice = createInvoice({
      id: createFinanceInvoiceId('invoice-1'),
      number: 'INV-001',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-1'),
      customerNumber: 'BC-001',
      invoiceDate: new Date('2026-07-01T00:00:00.000Z'),
      dueDate: new Date('2026-07-31T00:00:00.000Z'),
      currencyCode: 'USD',
      totalAmount: 125.5,
      remainingAmount: 25.5,
      status: 'Open',
    });
    const invoiceDateBefore = invoice.invoiceDate.getTime();
    const dueDateBefore = invoice.dueDate?.getTime();

    const response = toFinanceInvoiceResponse(invoice);

    expect(response).toEqual({
      id: 'invoice-1',
      number: 'INV-001',
      invoiceDate: '2026-07-01T00:00:00.000Z',
      dueDate: '2026-07-31T00:00:00.000Z',
      currencyCode: 'USD',
      totalAmount: 125.5,
      remainingAmount: 25.5,
      status: 'Open',
    });
    expect(response).not.toHaveProperty('businessCentralCustomerId');
    expect(response).not.toHaveProperty('customerNumber');
    expect(Object.isFrozen(response)).toBe(true);
    expect(invoice.invoiceDate.getTime()).toBe(invoiceDateBefore);
    expect(invoice.dueDate?.getTime()).toBe(dueDateBefore);
  });

  it('maps every approved credit memo field to a frozen HTTP response', () => {
    const creditMemo = createCreditMemo({
      id: createFinanceCreditMemoId('credit-memo-1'),
      number: 'CM-001',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-1'),
      customerNumber: 'BC-001',
      creditMemoDate: new Date('2026-07-02T00:00:00.000Z'),
      currencyCode: 'USD',
      totalAmount: 40,
      remainingAmount: 10,
      status: 'Open',
    });
    const dateBefore = creditMemo.creditMemoDate.getTime();

    const response = toFinanceCreditMemoResponse(creditMemo);

    expect(response).toEqual({
      id: 'credit-memo-1',
      number: 'CM-001',
      creditMemoDate: '2026-07-02T00:00:00.000Z',
      currencyCode: 'USD',
      totalAmount: 40,
      remainingAmount: 10,
      status: 'Open',
    });
    expect(response).not.toHaveProperty('businessCentralCustomerId');
    expect(response).not.toHaveProperty('customerNumber');
    expect(Object.isFrozen(response)).toBe(true);
    expect(creditMemo.creditMemoDate.getTime()).toBe(dateBefore);
  });

  it('omits optional fields that are absent', () => {
    const invoice = createInvoice({
      id: createFinanceInvoiceId('invoice-1'),
      number: 'INV-001',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-1'),
      invoiceDate: new Date('2026-07-01T00:00:00.000Z'),
      totalAmount: 125.5,
    });
    const creditMemo = createCreditMemo({
      id: createFinanceCreditMemoId('credit-memo-1'),
      number: 'CM-001',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-1'),
      creditMemoDate: new Date('2026-07-02T00:00:00.000Z'),
      totalAmount: 40,
    });

    expect(toFinanceInvoiceResponse(invoice)).toEqual({
      id: 'invoice-1',
      number: 'INV-001',
      invoiceDate: '2026-07-01T00:00:00.000Z',
      totalAmount: 125.5,
    });
    expect(toFinanceCreditMemoResponse(creditMemo)).toEqual({
      id: 'credit-memo-1',
      number: 'CM-001',
      creditMemoDate: '2026-07-02T00:00:00.000Z',
      totalAmount: 40,
    });
  });
});
