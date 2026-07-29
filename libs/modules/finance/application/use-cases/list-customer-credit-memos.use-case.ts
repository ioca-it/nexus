import type { AuthenticatedActor } from '@nexus/platform';
import type { CreditMemo, CreditMemoRepository } from '../../domain';
import type { CustomerBusinessCentralReferenceResolver } from '../customer-reference';
import { FINANCE_PERMISSION_ACTIONS } from '../security';
import {
  assertFinancePermission,
  resolveCustomerReference,
} from './finance-read-access';

export interface ListCustomerCreditMemosRequest {
  readonly actor: AuthenticatedActor;
}

export interface ListCustomerCreditMemosDependencies {
  readonly creditMemoRepository: CreditMemoRepository;
  readonly customerReferenceResolver: CustomerBusinessCentralReferenceResolver;
}

export class ListCustomerCreditMemosUseCase {
  constructor(
    private readonly dependencies: ListCustomerCreditMemosDependencies,
  ) {}

  async execute(
    request: ListCustomerCreditMemosRequest,
  ): Promise<readonly CreditMemo[]> {
    assertFinancePermission(
      request.actor,
      FINANCE_PERMISSION_ACTIONS.READ_CREDIT_MEMOS,
    );
    const businessCentralCustomerId = await resolveCustomerReference(
      request.actor,
      this.dependencies.customerReferenceResolver,
    );
    const creditMemos =
      await this.dependencies.creditMemoRepository.findByBusinessCentralCustomerId(
        businessCentralCustomerId,
      );

    return Object.freeze([...creditMemos]);
  }
}
