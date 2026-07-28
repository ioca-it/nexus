# Update Payment Notification

Updates the editable details of a payment notification while preserving its
identity, customer, status, and creation date.

```ts
import { UpdatePaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new UpdatePaymentNotificationUseCase({
  repository,
});

const result = await useCase.execute({
  actor,
  id,
  paymentDate,
  amount,
  currency,
  bankReference,
  receiptFileId,
  invoiceIds,
});
```

Editing requires the explicit `update` permission. Actors with a customer
context may only edit resources with an exactly matching `customerId`; actors
without customer context still need that explicit permission.

Editing remains limited to `DRAFT` and `CHANGES_REQUESTED`. The use case obtains
`updatedAt` from its clock, delegates domain validation and immutable
reconstruction to `PaymentNotification.updateDetails()`, awaits
`repository.update()`, and returns the updated entity.

This operation does not change status or invoke a state transition, workflow,
pipeline, or notifications. Resubmission remains a separate use case.
