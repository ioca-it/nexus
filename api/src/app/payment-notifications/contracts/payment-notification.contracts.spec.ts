import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { validate } from 'class-validator';

import { CreatePaymentNotificationDto } from './create-payment-notification.dto';
import type { PaymentNotificationResponse } from './payment-notification.response';
import { RejectPaymentNotificationDto } from './reject-payment-notification.dto';
import { RequestChangesPaymentNotificationDto } from './request-changes-payment-notification.dto';
import { ResubmitPaymentNotificationDto } from './resubmit-payment-notification.dto';
import { StartReviewPaymentNotificationDto } from './start-review-payment-notification.dto';
import { SubmitPaymentNotificationDto } from './submit-payment-notification.dto';
import { UpdatePaymentNotificationDto } from './update-payment-notification.dto';
import { ValidatePaymentNotificationDto } from './validate-payment-notification.dto';

const validInput = Object.freeze({
  paymentDate: '2026-07-27T12:00:00.000Z',
  amount: 125.5,
  currency: 'USD',
  bankReference: 'BANK-REFERENCE-1',
  receiptFileId: 'receipt-file-1',
  invoiceIds: Object.freeze(['invoice-1', 'invoice-2']),
});

function createDto(
  overrides: Partial<CreatePaymentNotificationDto> = {},
): CreatePaymentNotificationDto {
  return Object.assign(
    new CreatePaymentNotificationDto(),
    validInput,
    overrides,
  );
}

function updateDto(
  overrides: Partial<UpdatePaymentNotificationDto> = {},
): UpdatePaymentNotificationDto {
  return Object.assign(
    new UpdatePaymentNotificationDto(),
    validInput,
    overrides,
  );
}

describe('Payment Notifications API contracts', () => {
  it('accepts valid Create and Update DTOs', async () => {
    await expect(validate(createDto())).resolves.toEqual([]);
    await expect(validate(updateDto())).resolves.toEqual([]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid amount: %p',
    async (amount) => {
      const errors = await validate(createDto({ amount }));

      expect(errors.map(({ property }) => property)).toContain('amount');
    },
  );

  it('rejects an invalid paymentDate', async () => {
    const errors = await validate(
      createDto({ paymentDate: 'not-an-iso-date' }),
    );

    expect(errors.map(({ property }) => property)).toContain('paymentDate');
  });

  it('rejects an empty currency', async () => {
    const errors = await validate(createDto({ currency: '   ' }));

    expect(errors.map(({ property }) => property)).toContain('currency');
  });

  it('rejects an empty bankReference', async () => {
    const errors = await validate(createDto({ bankReference: '   ' }));

    expect(errors.map(({ property }) => property)).toContain('bankReference');
  });

  it('rejects invoiceIds when it is not an array', async () => {
    const errors = await validate(
      createDto({
        invoiceIds: 'invoice-1' as unknown as readonly string[],
      }),
    );

    expect(errors.map(({ property }) => property)).toContain('invoiceIds');
  });

  it('allows receiptFileId to be omitted', async () => {
    const dto = Object.assign(new CreatePaymentNotificationDto(), {
      paymentDate: validInput.paymentDate,
      amount: validInput.amount,
      currency: validInput.currency,
      bankReference: validInput.bankReference,
      invoiceIds: validInput.invoiceIds,
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto).not.toHaveProperty('receiptFileId');
  });

  it('does not include customerId or server-managed fields in Create', () => {
    const dto = createDto();

    expect(dto).not.toHaveProperty('id');
    expect(dto).not.toHaveProperty('customerId');
    expect(dto).not.toHaveProperty('status');
    expect(dto).not.toHaveProperty('createdAt');
    expect(dto).not.toHaveProperty('updatedAt');
  });

  it('does not include status or server-managed fields in Update', () => {
    const dto = updateDto();

    expect(dto).not.toHaveProperty('id');
    expect(dto).not.toHaveProperty('customerId');
    expect(dto).not.toHaveProperty('status');
    expect(dto).not.toHaveProperty('createdAt');
    expect(dto).not.toHaveProperty('updatedAt');
  });

  it('defines action DTOs with no body fields', () => {
    const actionDtos = [
      new SubmitPaymentNotificationDto(),
      new ResubmitPaymentNotificationDto(),
      new StartReviewPaymentNotificationDto(),
      new ValidatePaymentNotificationDto(),
      new RejectPaymentNotificationDto(),
      new RequestChangesPaymentNotificationDto(),
    ];

    expect(actionDtos.every((dto) => Object.keys(dto).length === 0)).toBe(true);
  });

  it('defines every field in PaymentNotificationResponse as JSON data', () => {
    const response: PaymentNotificationResponse = Object.freeze({
      id: 'payment-notification-1',
      status: 'DRAFT',
      customerId: 'customer-1',
      paymentDate: '2026-07-27T12:00:00.000Z',
      amount: 125.5,
      currency: 'USD',
      bankReference: 'BANK-REFERENCE-1',
      receiptFileId: 'receipt-file-1',
      invoiceIds: Object.freeze(['invoice-1']),
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });

    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
    expect(Object.keys(response)).toEqual([
      'id',
      'status',
      'customerId',
      'paymentDate',
      'amount',
      'currency',
      'bankReference',
      'receiptFileId',
      'invoiceIds',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('keeps HTTP contracts independent from domain and infrastructure', () => {
    const contractFiles = [
      'create-payment-notification.dto.ts',
      'update-payment-notification.dto.ts',
      'submit-payment-notification.dto.ts',
      'resubmit-payment-notification.dto.ts',
      'start-review-payment-notification.dto.ts',
      'validate-payment-notification.dto.ts',
      'reject-payment-notification.dto.ts',
      'request-changes-payment-notification.dto.ts',
      'payment-notification.response.ts',
    ];
    const source = contractFiles
      .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(
      /@nexus\/modules|repository|infrastructure|@nestjs|@Controller/,
    );
  });
});
