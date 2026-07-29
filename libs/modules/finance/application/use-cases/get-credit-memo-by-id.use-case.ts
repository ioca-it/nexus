import type { AuthenticatedActor } from '@nexus/platform';
import type {
  CreditMemo,
  CreditMemoRepository,
  FinanceCreditMemoId,
} from '../../domain';
import type { CustomerBusinessCentralReferenceResolver } from '../customer-reference';
import { FINANCE_PERMISSION_ACTIONS } from '../security';
import {
  assertCustomerOwnsResource,
  assertFinancePermission,
  resolveCustomerReference,
} from './finance-read-access';

export interface GetCreditMemoByIdRequest {
  readonly actor: AuthenticatedActor;
  readonly id: FinanceCreditMemoId;
}

export interface GetCreditMemoByIdDependencies {
  readonly creditMemoRepository: CreditMemoRepository;
  readonly customerReferenceResolver: CustomerBusinessCentralReferenceResolver;
}

export class GetCreditMemoByIdUseCase {
  constructor(private readonly dependencies: GetCreditMemoByIdDependencies) {}

  async execute(request: GetCreditMemoByIdRequest): Promise<CreditMemo | null> {
    assertFinancePermission(
      request.actor,
      FINANCE_PERMISSION_ACTIONS.READ_CREDIT_MEMOS,
    );

    const creditMemo = await this.dependencies.creditMemoRepository.findById(
      request.id,
    );

    if (creditMemo === null) {
      return null;
    }

    if (request.actor.customerId !== null) {
      const businessCentralCustomerId = await resolveCustomerReference(
        request.actor,
        this.dependencies.customerReferenceResolver,
      );
      assertCustomerOwnsResource(
        businessCentralCustomerId,
        creditMemo.businessCentralCustomerId,
      );
    }

    return creditMemo;
  }
}
