import {
  createBusinessCentralCustomerId,
  createCreditMemo,
  createFinanceCreditMemoId,
  createFinanceInvoiceId,
  createInvoice,
  createNexusCustomerId,
  type CreditMemo,
  type Invoice,
} from '../index';

function validInvoiceInput() {
  return Object.freeze({
    id: createFinanceInvoiceId(' invoice-id '),
    number: ' INV-100 ',
    businessCentralCustomerId:
      createBusinessCentralCustomerId(' bc-customer-id '),
    customerNumber: ' C-100 ',
    invoiceDate: new Date('2026-07-01T00:00:00Z'),
    dueDate: new Date('2026-08-01T00:00:00Z'),
    currencyCode: ' USD ',
    totalAmount: 125.5,
    remainingAmount: 25.5,
    status: ' Open ',
  });
}

function validCreditMemoInput() {
  return Object.freeze({
    id: createFinanceCreditMemoId(' credit-memo-id '),
    number: ' CM-100 ',
    businessCentralCustomerId:
      createBusinessCentralCustomerId(' bc-customer-id '),
    customerNumber: ' C-100 ',
    creditMemoDate: new Date('2026-07-02T00:00:00Z'),
    currencyCode: ' USD ',
    totalAmount: 40,
    remainingAmount: 10,
    status: ' Open ',
  });
}

describe('Finance domain read models', () => {
  it('creates a normalized, frozen invoice with optional fields', () => {
    const invoice: Invoice = createInvoice(validInvoiceInput());

    expect(invoice).toEqual({
      id: 'invoice-id',
      number: 'INV-100',
      businessCentralCustomerId: 'bc-customer-id',
      customerNumber: 'C-100',
      invoiceDate: new Date('2026-07-01T00:00:00Z'),
      dueDate: new Date('2026-08-01T00:00:00Z'),
      currencyCode: 'USD',
      totalAmount: 125.5,
      remainingAmount: 25.5,
      status: 'Open',
    });
    expect(Object.isFrozen(invoice)).toBe(true);
    expect(Object.isFrozen(invoice.invoiceDate)).toBe(true);
    expect(Object.isFrozen(invoice.dueDate)).toBe(true);
  });

  it('creates a normalized, frozen credit memo with optional fields', () => {
    const creditMemo: CreditMemo = createCreditMemo(validCreditMemoInput());

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
    expect(Object.isFrozen(creditMemo.creditMemoDate)).toBe(true);
  });

  it.each([
    ['Finance invoice id', () => createFinanceInvoiceId('   ')],
    ['Finance credit memo id', () => createFinanceCreditMemoId('')],
    ['NEXUS customer id', () => createNexusCustomerId('  ')],
    ['Business Central customer id', () => createBusinessCentralCustomerId('')],
  ])('rejects an empty %s', (fieldName, action) => {
    expect(action).toThrow(`${fieldName} is required`);
  });

  it('rejects empty document numbers', () => {
    expect(() =>
      createInvoice({ ...validInvoiceInput(), number: '  ' }),
    ).toThrow('Invoice number is required');
    expect(() =>
      createCreditMemo({ ...validCreditMemoInput(), number: '' }),
    ).toThrow('Credit memo number is required');
  });

  it('rejects invalid dates', () => {
    expect(() =>
      createInvoice({
        ...validInvoiceInput(),
        invoiceDate: new Date(Number.NaN),
      }),
    ).toThrow('Invoice date must be a valid date');
    expect(() =>
      createInvoice({
        ...validInvoiceInput(),
        dueDate: new Date(Number.NaN),
      }),
    ).toThrow('Invoice due date must be a valid date');
    expect(() =>
      createCreditMemo({
        ...validCreditMemoInput(),
        creditMemoDate: new Date(Number.NaN),
      }),
    ).toThrow('Credit memo date must be a valid date');
  });

  it.each([Number.NaN, Infinity, Number.NEGATIVE_INFINITY])(
    'rejects a non-finite total amount: %s',
    (amount) => {
      expect(() =>
        createInvoice({ ...validInvoiceInput(), totalAmount: amount }),
      ).toThrow('Invoice total amount must be finite');
      expect(() =>
        createCreditMemo({
          ...validCreditMemoInput(),
          totalAmount: amount,
        }),
      ).toThrow('Credit memo total amount must be finite');
    },
  );

  it('rejects non-finite optional remaining amounts', () => {
    expect(() =>
      createInvoice({
        ...validInvoiceInput(),
        remainingAmount: Infinity,
      }),
    ).toThrow('Invoice remaining amount must be finite');
    expect(() =>
      createCreditMemo({
        ...validCreditMemoInput(),
        remainingAmount: Number.NaN,
      }),
    ).toThrow('Credit memo remaining amount must be finite');
  });

  it('copies dates defensively and does not modify inputs', () => {
    const invoiceInput = validInvoiceInput();
    const creditMemoInput = validCreditMemoInput();
    const invoiceTime = invoiceInput.invoiceDate.getTime();
    const creditMemoTime = creditMemoInput.creditMemoDate.getTime();

    const invoice = createInvoice(invoiceInput);
    const creditMemo = createCreditMemo(creditMemoInput);

    expect(invoice.invoiceDate).not.toBe(invoiceInput.invoiceDate);
    expect(invoice.dueDate).not.toBe(invoiceInput.dueDate);
    expect(creditMemo.creditMemoDate).not.toBe(creditMemoInput.creditMemoDate);
    expect(invoiceInput.invoiceDate.getTime()).toBe(invoiceTime);
    expect(creditMemoInput.creditMemoDate.getTime()).toBe(creditMemoTime);
  });

  it('does not invent absent optional fields', () => {
    const invoice = createInvoice({
      id: createFinanceInvoiceId('invoice-id'),
      number: 'INV-100',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-id'),
      invoiceDate: new Date('2026-07-01'),
      totalAmount: 100,
    });
    const creditMemo = createCreditMemo({
      id: createFinanceCreditMemoId('credit-memo-id'),
      number: 'CM-100',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-id'),
      creditMemoDate: new Date('2026-07-02'),
      totalAmount: 25,
    });

    expect(invoice).not.toHaveProperty('customerNumber');
    expect(invoice).not.toHaveProperty('dueDate');
    expect(invoice).not.toHaveProperty('remainingAmount');
    expect(creditMemo).not.toHaveProperty('currencyCode');
    expect(creditMemo).not.toHaveProperty('remainingAmount');
  });

  it('contains no lines, payments, or receivables', () => {
    const invoice = createInvoice(validInvoiceInput());
    const creditMemo = createCreditMemo(validCreditMemoInput());

    expect(invoice).not.toHaveProperty('lines');
    expect(invoice).not.toHaveProperty('payments');
    expect(creditMemo).not.toHaveProperty('receivables');
  });
});
