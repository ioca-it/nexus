import type { CustomerBusinessCentralReferenceResolver } from '../../application';
import {
  createBusinessCentralCustomerId,
  createNexusCustomerId,
  type BusinessCentralCustomerId,
  type NexusCustomerId,
} from '../../domain';
import type { FinanceCustomerReferenceGateway } from './customer-reference.gateway';

export class DataverseCustomerBusinessCentralReferenceResolver
  implements CustomerBusinessCentralReferenceResolver
{
  constructor(private readonly gateway: FinanceCustomerReferenceGateway) {}

  async resolveByNexusCustomerId(
    customerId: NexusCustomerId,
  ): Promise<BusinessCentralCustomerId | null> {
    const normalizedCustomerId = createNexusCustomerId(customerId);
    const reference =
      await this.gateway.findByNexusCustomerId(normalizedCustomerId);

    return reference === null
      ? null
      : createBusinessCentralCustomerId(reference.businessCentralCustomerId);
  }
}
