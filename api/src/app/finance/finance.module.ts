import { Module } from '@nestjs/common';

import { DataverseModule } from '../dataverse';
import { FinanceController } from './controllers';
import { FINANCE_PROVIDERS } from './finance.providers';
import {
  GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE,
  GET_FINANCE_INVOICE_BY_ID_USE_CASE,
  LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE,
  LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE,
} from './finance.tokens';

@Module({
  imports: [DataverseModule],
  controllers: [FinanceController],
  providers: FINANCE_PROVIDERS,
  exports: [
    GET_FINANCE_INVOICE_BY_ID_USE_CASE,
    LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE,
    GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE,
    LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE,
  ],
})
export class FinanceModule {}
