# Submit order

`SubmitOrderUseCase` performs only the `DRAFT` to `SUBMITTED` transition for
the `orders.submit` action. It loads the order once, requires the actor's
explicit permission and exact customer ownership, then delegates the workflow
decision to Platform through `StateTransition` and the shared
`createOrderProcessRequest()` factory.

The transition requires no approval group. A denied or invalid pipeline result
returns the original order and the complete pipeline result without reading the
clock or persisting. An allowed result must specify `requireApproval: false`
and `nextState: SUBMITTED`; any other result is treated as an inconsistency.

The successful path obtains one timestamp, creates a new immutable entity with
`order.transitionTo()`, awaits one repository update, and preserves the entire
commercial snapshot. It performs no catalog, inventory, notification,
Dataverse, Business Central, or HTTP work.
