import type { Invoice } from '../invoice';
import type {
  BusinessCentralCustomerId,
  FinanceInvoiceId,
} from '../finance.types';

export interface InvoiceRepository {
  findById(id: FinanceInvoiceId): Promise<Invoice | null>;

  findByBusinessCentralCustomerId(
    customerId: BusinessCentralCustomerId,
  ): Promise<readonly Invoice[]>;
}
