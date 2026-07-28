# Resubmit Payment Notification

Loads a payment notification and evaluates `resubmit` through Platform's
`StateTransition`.

```ts
import { ResubmitPaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new ResubmitPaymentNotificationUseCase({
  repository,
  stateTransition,
});

const result = await useCase.execute({ id, actor });
```

The process request uses the entity's current status, the existing
`PAYMENT_NOTIFICATION_WORKFLOW` reference, and
`PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT`. Authorization uses only the explicit
`actor.permissions`; this transition does not require an approval group.
When `actor.customerId` is present, it must match the loaded payment
notification exactly. An actor without customer context still requires the
explicit `resubmit` permission.

Denied or invalid results return the original entity without reading the clock
or persisting. An allowed result must contain `requireApproval: false` and
authorize `SUBMITTED`.

The use case applies `CHANGES_REQUESTED` to `SUBMITTED` immediately through
`transitionTo()`, awaits `repository.update()`, and returns the persisted entity.
It does not alter the payment data reported by the customer.
