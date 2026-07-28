# Request Changes for a Payment Notification

Loads a payment notification and evaluates `request_changes` through Platform's
`StateTransition`.

```ts
import { RequestChangesPaymentNotificationUseCase } from '@nexus/modules/payment-notifications';

const useCase = new RequestChangesPaymentNotificationUseCase({
  repository,
  stateTransition,
  approvalGroupIds,
});

const result = await useCase.execute({ id, actor });
```

The process request uses the entity's current status, the existing
`PAYMENT_NOTIFICATION_WORKFLOW` reference, and
`PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES`. Authorization requires both an
explicit permission in `actor.permissions` and an exact match between
`actor.approvalGroupIds` and this action's configured `approvalGroupIds`.

Denied or invalid results return the original entity without reading the clock
or persisting. An allowed result must contain `requireApproval: true` and
authorize `CHANGES_REQUESTED`. The flag confirms that an authorized
administrative action satisfies the workflow requirement; the use case does not
create another approval request or intermediate state.

The use case applies `UNDER_REVIEW` to `CHANGES_REQUESTED` immediately through
`transitionTo()`, awaits `repository.update()`, and returns the persisted entity.
