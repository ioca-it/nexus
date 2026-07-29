import type { BusinessCentralCreditMemoGateway } from '@nexus/platform';
import type {
  BusinessCentralCustomerId,
  CreditMemo,
  CreditMemoRepository,
  FinanceCreditMemoId,
} from '../../domain';
import { toCreditMemo } from './mappers';

export class BusinessCentralCreditMemoRepository
  implements CreditMemoRepository
{
  constructor(private readonly gateway: BusinessCentralCreditMemoGateway) {}

  async findById(id: FinanceCreditMemoId): Promise<CreditMemo | null> {
    const creditMemo = await this.gateway.findById(id);

    return creditMemo === null ? null : toCreditMemo(creditMemo);
  }

  async findByBusinessCentralCustomerId(
    customerId: BusinessCentralCustomerId,
  ): Promise<readonly CreditMemo[]> {
    const creditMemos = await this.gateway.findByCustomer(customerId);

    return Object.freeze(creditMemos.map(toCreditMemo));
  }
}
