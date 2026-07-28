# Start Review Payment Notification

Loads a payment notification and evaluates `start_review` through Platform's
`StateTransition`.

```ts
import { StartReviewPaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new StartReviewPaymentNotificationUseCase({
  repository,
  stateTransition,
});

const result = await useCase.execute({ id, actor });
```

The process request uses the entity's current status, the existing
`PAYMENT_NOTIFICATION_WORKFLOW` reference, and
`PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW`. Authorization uses only the
explicit `actor.permissions`; this transition does not require an approval
group.

Denied or invalid results return the original entity without reading the clock
or persisting. An allowed and valid result must authorize `UNDER_REVIEW`; the
use case then creates a new immutable entity through `transitionTo()`, awaits
`repository.update()`, and returns it with the complete pipeline result.
