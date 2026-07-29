import type { AuthenticatedActor } from '@nexus/platform';
import type {
  FinanceInvoiceId,
  Invoice,
  InvoiceRepository,
} from '../../domain';
import type { CustomerBusinessCentralReferenceResolver } from '../customer-reference';
import { FINANCE_PERMISSION_ACTIONS } from '../security';
import {
  assertCustomerOwnsResource,
  assertFinancePermission,
  resolveCustomerReference,
} from './finance-read-access';

export interface GetInvoiceByIdRequest {
  readonly actor: AuthenticatedActor;
  readonly id: FinanceInvoiceId;
}

export interface GetInvoiceByIdDependencies {
  readonly invoiceRepository: InvoiceRepository;
  readonly customerReferenceResolver: CustomerBusinessCentralReferenceResolver;
}

export class GetInvoiceByIdUseCase {
  constructor(private readonly dependencies: GetInvoiceByIdDependencies) {}

  async execute(request: GetInvoiceByIdRequest): Promise<Invoice | null> {
    assertFinancePermission(
      request.actor,
      FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
    );

    const invoice = await this.dependencies.invoiceRepository.findById(
      request.id,
    );

    if (invoice === null) {
      return null;
    }

    if (request.actor.customerId !== null) {
      const businessCentralCustomerId = await resolveCustomerReference(
        request.actor,
        this.dependencies.customerReferenceResolver,
      );
      assertCustomerOwnsResource(
        businessCentralCustomerId,
        invoice.businessCentralCustomerId,
      );
    }

    return invoice;
  }
}
