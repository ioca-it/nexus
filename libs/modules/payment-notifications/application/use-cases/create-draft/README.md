# Create Draft Payment Notification

Creates a `PaymentNotification` in `DRAFT` state by delegating directly to
`PaymentNotification.create()`.

```ts
import { CreateDraftPaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new CreateDraftPaymentNotificationUseCase({ repository });
const { paymentNotification } = await useCase.execute(request);
```

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

The use case does not invoke Platform engines, workflows, permissions,
notifications, or external services.
