# Reject Payment Notification

Loads a payment notification and evaluates `reject` through Platform's
`StateTransition`.

```ts
import { RejectPaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new RejectPaymentNotificationUseCase({
  repository,
  stateTransition,
  approvalGroupIds,
});

const result = await useCase.execute({ id, actor });
```

The process request uses the entity's current status, the existing
`PAYMENT_NOTIFICATION_WORKFLOW` reference, and
`PAYMENT_NOTIFICATION_ACTIONS.REJECT`. Authorization requires both an explicit
permission in `actor.permissions` and an exact match between
`actor.approvalGroupIds` and this action's configured `approvalGroupIds`.

Denied or invalid results return the original entity without reading the clock
or persisting. An allowed result must contain `requireApproval: true` and
authorize `REJECTED`.

The use case applies the `UNDER_REVIEW` to `REJECTED` transition immediately
through `transitionTo()`, awaits `repository.update()`, and returns the persisted
entity.
