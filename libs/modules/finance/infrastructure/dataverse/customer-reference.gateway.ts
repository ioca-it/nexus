import type { NexusCustomerId } from '../../domain';

export interface FinanceCustomerReferenceRecord {
  readonly nexusCustomerId: string;
  readonly businessCentralCustomerId: string;
  readonly active: boolean;
}

export interface FinanceCustomerReferenceGateway {
  findByNexusCustomerId(
    customerId: NexusCustomerId,
  ): Promise<FinanceCustomerReferenceRecord | null>;
}
