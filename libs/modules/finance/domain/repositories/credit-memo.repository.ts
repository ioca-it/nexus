import type { CreditMemo } from '../credit-memo';
import type {
  BusinessCentralCustomerId,
  FinanceCreditMemoId,
} from '../finance.types';

export interface CreditMemoRepository {
  findById(id: FinanceCreditMemoId): Promise<CreditMemo | null>;

  findByBusinessCentralCustomerId(
    customerId: BusinessCentralCustomerId,
  ): Promise<readonly CreditMemo[]>;
}
