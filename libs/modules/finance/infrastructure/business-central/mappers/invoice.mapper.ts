import type { BusinessCentralInvoice } from '@nexus/platform';
import {
  createBusinessCentralCustomerId,
  createFinanceInvoiceId,
  createInvoice,
  type Invoice,
} from '../../../domain';

export function toInvoice(source: BusinessCentralInvoice): Invoice {
  return createInvoice({
    id: createFinanceInvoiceId(source.id),
    number: source.number,
    businessCentralCustomerId: createBusinessCentralCustomerId(
      source.customerId,
    ),
    customerNumber: source.customerNumber,
    invoiceDate: source.invoiceDate,
    dueDate: source.dueDate,
    currencyCode: source.currencyCode,
    totalAmount: source.totalAmount,
    remainingAmount: source.remainingAmount,
    status: source.status,
  });
}
