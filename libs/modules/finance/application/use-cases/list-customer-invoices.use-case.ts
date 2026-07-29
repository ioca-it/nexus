import type { AuthenticatedActor } from '@nexus/platform';
import type { Invoice, InvoiceRepository } from '../../domain';
import type { CustomerBusinessCentralReferenceResolver } from '../customer-reference';
import { FINANCE_PERMISSION_ACTIONS } from '../security';
import {
  assertFinancePermission,
  resolveCustomerReference,
} from './finance-read-access';

export interface ListCustomerInvoicesRequest {
  readonly actor: AuthenticatedActor;
}

export interface ListCustomerInvoicesDependencies {
  readonly invoiceRepository: InvoiceRepository;
  readonly customerReferenceResolver: CustomerBusinessCentralReferenceResolver;
}

export class ListCustomerInvoicesUseCase {
  constructor(
    private readonly dependencies: ListCustomerInvoicesDependencies,
  ) {}

  async execute(
    request: ListCustomerInvoicesRequest,
  ): Promise<readonly Invoice[]> {
    assertFinancePermission(
      request.actor,
      FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
    );
    const businessCentralCustomerId = await resolveCustomerReference(
      request.actor,
      this.dependencies.customerReferenceResolver,
    );
    const invoices =
      await this.dependencies.invoiceRepository.findByBusinessCentralCustomerId(
        businessCentralCustomerId,
      );

    return Object.freeze([...invoices]);
  }
}
