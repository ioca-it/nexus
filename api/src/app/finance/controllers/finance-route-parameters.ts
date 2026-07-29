import { BadRequestException } from '@nestjs/common';
import type {
  FinanceCreditMemoId,
  FinanceInvoiceId,
} from '@nexus/modules/finance';

function normalizeFinanceDocumentId<T extends string>(id: string): T {
  const normalized = id?.trim();

  if (!normalized) {
    throw new BadRequestException('Finance document id is required.');
  }

  return normalized as T;
}

export function normalizeFinanceInvoiceId(id: string): FinanceInvoiceId {
  return normalizeFinanceDocumentId<FinanceInvoiceId>(id);
}

export function normalizeFinanceCreditMemoId(id: string): FinanceCreditMemoId {
  return normalizeFinanceDocumentId<FinanceCreditMemoId>(id);
}
