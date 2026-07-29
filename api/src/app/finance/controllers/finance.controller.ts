import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import type {
  GetCreditMemoByIdUseCase,
  GetInvoiceByIdUseCase,
  ListCustomerCreditMemosUseCase,
  ListCustomerInvoicesUseCase,
} from '@nexus/modules/finance';
import type { AuthenticatedActor } from '@nexus/platform';

import { CurrentActor } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type {
  FinanceCreditMemoResponse,
  FinanceInvoiceResponse,
} from '../contracts';
import {
  toFinanceCreditMemoResponse,
  toFinanceInvoiceResponse,
} from '../mappers';
import {
  GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE,
  GET_FINANCE_INVOICE_BY_ID_USE_CASE,
  LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE,
  LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE,
} from '../finance.tokens';
import {
  normalizeFinanceCreditMemoId,
  normalizeFinanceInvoiceId,
} from './finance-route-parameters';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    @Inject(GET_FINANCE_INVOICE_BY_ID_USE_CASE)
    private readonly getInvoiceByIdUseCase: GetInvoiceByIdUseCase,
    @Inject(LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE)
    private readonly listCustomerInvoicesUseCase: ListCustomerInvoicesUseCase,
    @Inject(GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE)
    private readonly getCreditMemoByIdUseCase: GetCreditMemoByIdUseCase,
    @Inject(LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE)
    private readonly listCustomerCreditMemosUseCase: ListCustomerCreditMemosUseCase,
  ) {}

  @Get('invoices')
  @HttpCode(HttpStatus.OK)
  async listInvoices(
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<readonly FinanceInvoiceResponse[]> {
    const invoices = await this.listCustomerInvoicesUseCase.execute({ actor });

    return Object.freeze(invoices.map(toFinanceInvoiceResponse));
  }

  @Get('invoices/:id')
  @HttpCode(HttpStatus.OK)
  async getInvoiceById(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<FinanceInvoiceResponse> {
    const invoice = await this.getInvoiceByIdUseCase.execute({
      actor,
      id: normalizeFinanceInvoiceId(id),
    });

    if (invoice === null) {
      throw new NotFoundException('Finance invoice was not found.');
    }

    return toFinanceInvoiceResponse(invoice);
  }

  @Get('credit-memos')
  @HttpCode(HttpStatus.OK)
  async listCreditMemos(
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<readonly FinanceCreditMemoResponse[]> {
    const creditMemos = await this.listCustomerCreditMemosUseCase.execute({
      actor,
    });

    return Object.freeze(creditMemos.map(toFinanceCreditMemoResponse));
  }

  @Get('credit-memos/:id')
  @HttpCode(HttpStatus.OK)
  async getCreditMemoById(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<FinanceCreditMemoResponse> {
    const creditMemo = await this.getCreditMemoByIdUseCase.execute({
      actor,
      id: normalizeFinanceCreditMemoId(id),
    });

    if (creditMemo === null) {
      throw new NotFoundException('Finance credit memo was not found.');
    }

    return toFinanceCreditMemoResponse(creditMemo);
  }
}
