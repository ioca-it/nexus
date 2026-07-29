import type { BusinessCentralCustomerId, NexusCustomerId } from '../../domain';

export interface CustomerBusinessCentralReferenceResolver {
  resolveByNexusCustomerId(
    customerId: NexusCustomerId,
  ): Promise<BusinessCentralCustomerId | null>;
}
