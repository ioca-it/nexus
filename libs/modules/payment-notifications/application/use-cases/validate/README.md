# Validate Payment Notification

Loads a payment notification and evaluates `validate` through Platform's
`StateTransition`.

```ts
import { ValidatePaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new ValidatePaymentNotificationUseCase({
  repository,
  stateTransition,
  approvalGroupIds,
});

const result = await useCase.execute({ id, actor });
```

The process request uses the entity's current status, the existing
`PAYMENT_NOTIFICATION_WORKFLOW` reference, and
`PAYMENT_NOTIFICATION_ACTIONS.VALIDATE`. Authorization requires both an
explicit permission in `actor.permissions` and an exact match between
`actor.approvalGroupIds` and this action's configured `approvalGroupIds`.

Denied or invalid results return the original entity without reading the clock
or persisting. An allowed result must contain `requireApproval: true` and
authorize `VALIDATED`. The flag confirms that an authorized administrative
action satisfied the workflow requirement; it does not create another approval
request or intermediate state.

The use case applies `VALIDATED` immediately through `transitionTo()`, awaits
`repository.update()`, and returns the persisted entity. Validation does not
post or create an official payment in Business Central.
