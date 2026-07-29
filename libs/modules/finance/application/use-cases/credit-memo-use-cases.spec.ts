import type { AuthenticatedActor } from '@nexus/platform';
import {
  createBusinessCentralCustomerId,
  createCreditMemo,
  createFinanceCreditMemoId,
  FINANCE_PERMISSION_ACTIONS,
  FINANCE_PERMISSION_MODULE,
  GetCreditMemoByIdUseCase,
  ListCustomerCreditMemosUseCase,
  type BusinessCentralCustomerId,
  type CreditMemo,
  type CreditMemoRepository,
  type CustomerBusinessCentralReferenceResolver,
} from '../../index';

const NEXUS_CUSTOMER_ID = 'nexus-customer-id';
const BC_CUSTOMER_ID = createBusinessCentralCustomerId(
  'business-central-customer-id',
);
const OTHER_BC_CUSTOMER_ID = createBusinessCentralCustomerId(
  'other-business-central-customer-id',
);
const CREDIT_MEMO_ID = createFinanceCreditMemoId('credit-memo-id');

const creditMemo = createCreditMemo({
  id: CREDIT_MEMO_ID,
  number: 'CM-100',
  businessCentralCustomerId: BC_CUSTOMER_ID,
  creditMemoDate: new Date('2026-07-02'),
  totalAmount: 25,
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
              action: FINANCE_PERMISSION_ACTIONS.READ_CREDIT_MEMOS,
              effect: 'allow' as const,
            }),
          ]
        : [],
    ),
    approvalGroupIds: Object.freeze([]),
  });
}

function createDependencies(
  foundCreditMemo: CreditMemo | null = creditMemo,
  resolvedCustomerId: BusinessCentralCustomerId | null = BC_CUSTOMER_ID,
): {
  readonly creditMemoRepository: jest.Mocked<CreditMemoRepository>;
  readonly customerReferenceResolver: jest.Mocked<CustomerBusinessCentralReferenceResolver>;
} {
  return {
    creditMemoRepository: {
      findById: jest.fn().mockResolvedValue(foundCreditMemo),
      findByBusinessCentralCustomerId: jest
        .fn()
        .mockResolvedValue(Object.freeze([foundCreditMemo])),
    },
    customerReferenceResolver: {
      resolveByNexusCustomerId: jest.fn().mockResolvedValue(resolvedCustomerId),
    },
  };
}

describe('Credit memo read use cases', () => {
  it('allows a permitted customer with a valid reference to read its credit memo', async () => {
    const dependencies = createDependencies();
    const useCase = new GetCreditMemoByIdUseCase(dependencies);

    await expect(
      useCase.execute({ actor: createActor(), id: CREDIT_MEMO_ID }),
    ).resolves.toBe(creditMemo);
    expect(dependencies.creditMemoRepository.findById).toHaveBeenCalledTimes(1);
    expect(
      dependencies.customerReferenceResolver.resolveByNexusCustomerId,
    ).toHaveBeenCalledWith(NEXUS_CUSTOMER_ID);
  });

  it('denies another Business Central reference and a missing link', async () => {
    const mismatch = createDependencies(creditMemo, OTHER_BC_CUSTOMER_ID);
    const missingLink = createDependencies(creditMemo, null);

    await expect(
      new GetCreditMemoByIdUseCase(mismatch).execute({
        actor: createActor(),
        id: CREDIT_MEMO_ID,
      }),
    ).rejects.toThrow('Finance access denied');
    await expect(
      new GetCreditMemoByIdUseCase(missingLink).execute({
        actor: createActor(),
        id: CREDIT_MEMO_ID,
      }),
    ).rejects.toThrow('Finance access denied');
  });

  it('allows customerless read by ID only with explicit permission', async () => {
    const allowed = createDependencies();
    const denied = createDependencies();

    await expect(
      new GetCreditMemoByIdUseCase(allowed).execute({
        actor: createActor(null, true, ['Nexus.Admin']),
        id: CREDIT_MEMO_ID,
      }),
    ).resolves.toBe(creditMemo);
    await expect(
      new GetCreditMemoByIdUseCase(denied).execute({
        actor: createActor(null, false, ['Nexus.Admin']),
        id: CREDIT_MEMO_ID,
      }),
    ).rejects.toThrow('Finance access denied');
    expect(
      allowed.customerReferenceResolver.resolveByNexusCustomerId,
    ).not.toHaveBeenCalled();
    expect(denied.creditMemoRepository.findById).not.toHaveBeenCalled();
  });

  it('returns null for a missing credit memo without resolving', async () => {
    const dependencies = createDependencies(null);

    await expect(
      new GetCreditMemoByIdUseCase(dependencies).execute({
        actor: createActor(),
        id: CREDIT_MEMO_ID,
      }),
    ).resolves.toBeNull();
    expect(
      dependencies.customerReferenceResolver.resolveByNexusCustomerId,
    ).not.toHaveBeenCalled();
  });

  it('lists only by the customer reference resolved from the actor', async () => {
    const dependencies = createDependencies();
    const request = Object.freeze({ actor: createActor() });

    const result = await new ListCustomerCreditMemosUseCase(
      dependencies,
    ).execute(request);

    expect(Object.keys(request)).toEqual(['actor']);
    expect(
      dependencies.creditMemoRepository.findByBusinessCentralCustomerId,
    ).toHaveBeenCalledWith(BC_CUSTOMER_ID);
    expect(
      dependencies.creditMemoRepository.findByBusinessCentralCustomerId,
    ).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toEqual([creditMemo]);
  });

  it('denies listing without customer context, link, or permission', async () => {
    const withoutContext = createDependencies();
    const withoutLink = createDependencies(creditMemo, null);
    const withoutPermission = createDependencies();

    await expect(
      new ListCustomerCreditMemosUseCase(withoutContext).execute({
        actor: createActor(null),
      }),
    ).rejects.toThrow('Finance access denied');
    await expect(
      new ListCustomerCreditMemosUseCase(withoutLink).execute({
        actor: createActor(),
      }),
    ).rejects.toThrow('Finance access denied');
    await expect(
      new ListCustomerCreditMemosUseCase(withoutPermission).execute({
        actor: createActor(NEXUS_CUSTOMER_ID, false),
      }),
    ).rejects.toThrow('Finance access denied');
    expect(
      withoutPermission.customerReferenceResolver.resolveByNexusCustomerId,
    ).not.toHaveBeenCalled();
  });

  it('propagates repository and resolver errors unchanged', async () => {
    const repositoryError = new Error('repository failed');
    const resolverError = new Error('resolver failed');
    const repositoryFailure = createDependencies();
    repositoryFailure.creditMemoRepository.findById.mockRejectedValue(
      repositoryError,
    );
    const resolverFailure = createDependencies();
    resolverFailure.customerReferenceResolver.resolveByNexusCustomerId.mockRejectedValue(
      resolverError,
    );

    await expect(
      new GetCreditMemoByIdUseCase(repositoryFailure).execute({
        actor: createActor(),
        id: CREDIT_MEMO_ID,
      }),
    ).rejects.toBe(repositoryError);
    await expect(
      new ListCustomerCreditMemosUseCase(resolverFailure).execute({
        actor: createActor(),
      }),
    ).rejects.toBe(resolverError);
  });

  it('returns a defensive readonly collection without modifying inputs', async () => {
    const dependencies = createDependencies();
    const actor = createActor();
    const request = Object.freeze({ actor });
    const repositoryCollection = Object.freeze([creditMemo]);
    dependencies.creditMemoRepository.findByBusinessCentralCustomerId.mockResolvedValue(
      repositoryCollection,
    );

    const result = await new ListCustomerCreditMemosUseCase(
      dependencies,
    ).execute(request);

    expect(request.actor).toBe(actor);
    expect(result).not.toBe(repositoryCollection);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
