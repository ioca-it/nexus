# Update Payment Notification

Updates the editable details of a payment notification while preserving its
identity, customer, status, and creation date.

```ts
import { UpdatePaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new UpdatePaymentNotificationUseCase({
  repository,
});

const result = await useCase.execute({
  id,
  paymentDate,
  amount,
  currency,
  bankReference,
  receiptFileId,
  invoiceIds,
});
```

Editing is allowed only in `DRAFT` and `CHANGES_REQUESTED`. The use case obtains
`updatedAt` from its clock, delegates domain validation and immutable
reconstruction to `PaymentNotification.updateDetails()`, awaits
`repository.update()`, and returns the updated entity.

This operation does not change status or invoke a state transition, workflow,
pipeline, permissions, or notifications. Resubmission remains a separate use
case.
