import type { BusinessCentralCreditMemo } from '@nexus/platform';
import {
  createBusinessCentralCustomerId,
  createCreditMemo,
  createFinanceCreditMemoId,
  type CreditMemo,
} from '../../../domain';

export function toCreditMemo(source: BusinessCentralCreditMemo): CreditMemo {
  return createCreditMemo({
    id: createFinanceCreditMemoId(source.id),
    number: source.number,
    businessCentralCustomerId: createBusinessCentralCustomerId(
      source.customerId,
    ),
    customerNumber: source.customerNumber,
    creditMemoDate: source.creditMemoDate,
    currencyCode: source.currencyCode,
    totalAmount: source.totalAmount,
    remainingAmount: source.remainingAmount,
    status: source.status,
  });
}
