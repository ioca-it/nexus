import type { CreditMemo, Invoice } from '@nexus/modules/finance';

import type {
  FinanceCreditMemoResponse,
  FinanceInvoiceResponse,
} from '../contracts';

export function toFinanceInvoiceResponse(
  invoice: Invoice,
): FinanceInvoiceResponse {
  return Object.freeze({
    id: invoice.id,
    number: invoice.number,
    invoiceDate: invoice.invoiceDate.toISOString(),
    ...(invoice.dueDate === undefined
      ? {}
      : { dueDate: invoice.dueDate.toISOString() }),
    ...(invoice.currencyCode === undefined
      ? {}
      : { currencyCode: invoice.currencyCode }),
    totalAmount: invoice.totalAmount,
    ...(invoice.remainingAmount === undefined
      ? {}
      : { remainingAmount: invoice.remainingAmount }),
    ...(invoice.status === undefined ? {} : { status: invoice.status }),
  });
}

export function toFinanceCreditMemoResponse(
  creditMemo: CreditMemo,
): FinanceCreditMemoResponse {
  return Object.freeze({
    id: creditMemo.id,
    number: creditMemo.number,
    creditMemoDate: creditMemo.creditMemoDate.toISOString(),
    ...(creditMemo.currencyCode === undefined
      ? {}
      : { currencyCode: creditMemo.currencyCode }),
    totalAmount: creditMemo.totalAmount,
    ...(creditMemo.remainingAmount === undefined
      ? {}
      : { remainingAmount: creditMemo.remainingAmount }),
    ...(creditMemo.status === undefined ? {} : { status: creditMemo.status }),
  });
}
