# Submit Payment Notification

Loads a payment notification and evaluates its `submit` action through the
Platform `StateTransition` abstraction.

```ts
import { SubmitPaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new SubmitPaymentNotificationUseCase({
  repository,
  stateTransition,
});

const result = await useCase.execute({ id, actor });
```

The use case passes the existing `PAYMENT_NOTIFICATION_WORKFLOW` reference to
Platform. It does not rebuild transitions or call the Process Engine or
Application Pipeline directly. Authorization uses only the explicit
`actor.permissions`; this transition does not require an approval group.
When `actor.customerId` is present, it must match the loaded payment
notification exactly. An actor without customer context still requires the
explicit `submit` permission.

Denied and invalid pipeline results are returned with the original entity and
are not persisted. An allowed and valid result obtains the current time,
creates a new immutable `SUBMITTED` entity through `transitionTo()`, awaits
`repository.update()`, and returns the persisted entity.
