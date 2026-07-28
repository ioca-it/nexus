# Create Draft Payment Notification

Creates a `PaymentNotification` in `DRAFT` state after evaluating the actor's
explicit `create_draft` permission.

```ts
import { CreateDraftPaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new CreateDraftPaymentNotificationUseCase({ repository });
const { paymentNotification } = await useCase.execute({
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

`customerId` is not accepted by the request. It is taken exclusively from
`actor.customerId`, which must be present. Authorization denial happens before
the clock, entity creation, or persistence.

By default, the use case obtains the creation timestamp from `new Date()`. A
clock can be injected for deterministic tests:

```ts
const useCase = new CreateDraftPaymentNotificationUseCase({
  repository,
  clock: () => new Date('2026-07-24T15:30:00.000Z'),
});
```

The clock runs exactly once per execution. `createdAt` and `updatedAt` receive
separate defensive copies of that timestamp, while `paymentDate` retains only
the payment date supplied in the request.

After creating the `DRAFT` entity through `PaymentNotification.create()`, the
use case awaits `repository.create(paymentNotification)` and returns that same
entity. Domain and repository errors are propagated unchanged.

The use case reuses Platform's Permissions Engine through the module access
policy. It does not execute workflow, notifications, or external services.
