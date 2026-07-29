import type { BusinessCentralInvoiceGateway } from '@nexus/platform';
import type {
  BusinessCentralCustomerId,
  FinanceInvoiceId,
  Invoice,
  InvoiceRepository,
} from '../../domain';
import { toInvoice } from './mappers';

export class BusinessCentralInvoiceRepository implements InvoiceRepository {
  constructor(private readonly gateway: BusinessCentralInvoiceGateway) {}

  async findById(id: FinanceInvoiceId): Promise<Invoice | null> {
    const invoice = await this.gateway.findById(id);

    return invoice === null ? null : toInvoice(invoice);
  }

  async findByBusinessCentralCustomerId(
    customerId: BusinessCentralCustomerId,
  ): Promise<readonly Invoice[]> {
    const invoices = await this.gateway.findByCustomer(customerId);

    return Object.freeze(invoices.map(toInvoice));
  }
}
