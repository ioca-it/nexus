import type { AuthenticatedActor } from '@nexus/platform';
import {
  createBusinessCentralCustomerId,
  createFinanceInvoiceId,
  createInvoice,
  GetInvoiceByIdUseCase,
  ListCustomerInvoicesUseCase,
  FINANCE_PERMISSION_ACTIONS,
  FINANCE_PERMISSION_MODULE,
  type BusinessCentralCustomerId,
  type CustomerBusinessCentralReferenceResolver,
  type Invoice,
  type InvoiceRepository,
} from '../../index';

const NEXUS_CUSTOMER_ID = 'nexus-customer-id';
const BC_CUSTOMER_ID = createBusinessCentralCustomerId(
  'business-central-customer-id',
);
const OTHER_BC_CUSTOMER_ID = createBusinessCentralCustomerId(
  'other-business-central-customer-id',
);
const INVOICE_ID = createFinanceInvoiceId('invoice-id');

const invoice = createInvoice({
  id: INVOICE_ID,
  number: 'INV-100',
  businessCentralCustomerId: BC_CUSTOMER_ID,
  invoiceDate: new Date('2026-07-01'),
  totalAmount: 100,
});

function createActor(
  customerId: string | null = NEXUS_CUSTOMER_ID,
  allowed = true,
  roles: readonly string[] = [],
): AuthenticatedActor {
  return Object.freeze({
    userId: 'user-id',
    customerId,
    roles: Object.freeze([...roles]),
    permissions: Object.freeze(
      allowed
        ? [
            Object.freeze({
              module: FINANCE_PERMISSION_MODULE,
              action: FINANCE_PERMISSION_ACTIONS.READ_INVOICES,
              effect: 'allow' as const,
            }),
          ]
        : [],
    ),
    approvalGroupIds: Object.freeze([]),
  });
}

function createDependencies(
  foundInvoice: Invoice | null = invoice,
  resolvedCustomerId: BusinessCentralCustomerId | null = BC_CUSTOMER_ID,
): {
  readonly invoiceRepository: jest.Mocked<InvoiceRepository>;
  readonly customerReferenceResolver: jest.Mocked<CustomerBusinessCentralReferenceResolver>;
} {
  return {
    invoiceRepository: {
      findById: jest.fn().mockResolvedValue(foundInvoice),
      findByBusinessCentralCustomerId: jest
        .fn()
        .mockResolvedValue(Object.freeze([foundInvoice])),
    },
    customerReferenceResolver: {
      resolveByNexusCustomerId: jest.fn().mockResolvedValue(resolvedCustomerId),
    },
  };
}

describe('Invoice read use cases', () => {
  it('allows a permitted customer with a valid reference to read its invoice', async () => {
    const dependencies = createDependencies();
    const useCase = new GetInvoiceByIdUseCase(dependencies);

    await expect(
      useCase.execute({ actor: createActor(), id: INVOICE_ID }),
    ).resolves.toBe(invoice);
    expect(dependencies.invoiceRepository.findById).toHaveBeenCalledTimes(1);
    expect(
      dependencies.customerReferenceResolver.resolveByNexusCustomerId,
    ).toHaveBeenCalledWith(NEXUS_CUSTOMER_ID);
  });

  it('denies a customer mapped to another Business Central reference', async () => {
    const dependencies = createDependencies(invoice, OTHER_BC_CUSTOMER_ID);
    const useCase = new GetInvoiceByIdUseCase(dependencies);

    await expect(
      useCase.execute({ actor: createActor(), id: INVOICE_ID }),
    ).rejects.toThrow('Finance access denied');
  });

  it('denies a customer without a Business Central link', async () => {
    const dependencies = createDependencies(invoice, null);
    const useCase = new GetInvoiceByIdUseCase(dependencies);

    await expect(
      useCase.execute({ actor: createActor(), id: INVOICE_ID }),
    ).rejects.toThrow('Finance access denied');
  });

  it('allows an actor without customer context to read by ID with explicit permission', async () => {
    const dependencies = createDependencies();
    const useCase = new GetInvoiceByIdUseCase(dependencies);

    await expect(
      useCase.execute({
        actor: createActor(null, true, ['Nexus.Admin']),
        id: INVOICE_ID,
      }),
    ).resolves.toBe(invoice);
    expect(
      dependencies.customerReferenceResolver.resolveByNexusCustomerId,
    ).not.toHaveBeenCalled();
  });

  it('denies an administrator without explicit permission before repository I/O', async () => {
    const dependencies = createDependencies();
    const useCase = new GetInvoiceByIdUseCase(dependencies);

    await expect(
      useCase.execute({
        actor: createActor(null, false, ['Nexus.Admin']),
        id: INVOICE_ID,
      }),
    ).rejects.toThrow('Finance access denied');
    expect(dependencies.invoiceRepository.findById).not.toHaveBeenCalled();
  });

  it('returns null for a missing invoice and does not resolve a reference', async () => {
    const dependencies = createDependencies(null);
    const useCase = new GetInvoiceByIdUseCase(dependencies);

    await expect(
      useCase.execute({ actor: createActor(), id: INVOICE_ID }),
    ).resolves.toBeNull();
    expect(dependencies.invoiceRepository.findById).toHaveBeenCalledTimes(1);
    expect(
      dependencies.customerReferenceResolver.resolveByNexusCustomerId,
    ).not.toHaveBeenCalled();
  });

  it('lists only by the Business Central customer reference derived from the actor', async () => {
    const dependencies = createDependencies();
    const useCase = new ListCustomerInvoicesUseCase(dependencies);
    const request = Object.freeze({ actor: createActor() });

    const result = await useCase.execute(request);

    expect(Object.keys(request)).toEqual(['actor']);
    expect(
      dependencies.invoiceRepository.findByBusinessCentralCustomerId,
    ).toHaveBeenCalledWith(BC_CUSTOMER_ID);
    expect(
      dependencies.invoiceRepository.findByBusinessCentralCustomerId,
    ).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toEqual([invoice]);
  });

  it('denies listing without customer context or without a link', async () => {
    const withoutContext = createDependencies();
    const withoutLink = createDependencies(invoice, null);

    await expect(
      new ListCustomerInvoicesUseCase(withoutContext).execute({
        actor: createActor(null),
      }),
    ).rejects.toThrow('Finance access denied');
    await expect(
      new ListCustomerInvoicesUseCase(withoutLink).execute({
        actor: createActor(),
      }),
    ).rejects.toThrow('Finance access denied');
    expect(
      withoutContext.invoiceRepository.findByBusinessCentralCustomerId,
    ).not.toHaveBeenCalled();
    expect(
      withoutLink.invoiceRepository.findByBusinessCentralCustomerId,
    ).not.toHaveBeenCalled();
  });

  it('propagates repository and resolver errors unchanged', async () => {
    const repositoryError = new Error('repository failed');
    const resolverError = new Error('resolver failed');
    const repositoryFailure = createDependencies();
    repositoryFailure.invoiceRepository.findById.mockRejectedValue(
      repositoryError,
    );
    const resolverFailure = createDependencies();
    resolverFailure.customerReferenceResolver.resolveByNexusCustomerId.mockRejectedValue(
      resolverError,
    );

    await expect(
      new GetInvoiceByIdUseCase(repositoryFailure).execute({
        actor: createActor(),
        id: INVOICE_ID,
      }),
    ).rejects.toBe(repositoryError);
    await expect(
      new ListCustomerInvoicesUseCase(resolverFailure).execute({
        actor: createActor(),
      }),
    ).rejects.toBe(resolverError);
  });

  it('does not modify request, actor, or repository collections', async () => {
    const dependencies = createDependencies();
    const actor = createActor();
    const request = Object.freeze({ actor });
    const repositoryCollection = Object.freeze([invoice]);
    dependencies.invoiceRepository.findByBusinessCentralCustomerId.mockResolvedValue(
      repositoryCollection,
    );

    const result = await new ListCustomerInvoicesUseCase(dependencies).execute(
      request,
    );

    expect(request.actor).toBe(actor);
    expect(repositoryCollection).toEqual([invoice]);
    expect(result).not.toBe(repositoryCollection);
  });
});
