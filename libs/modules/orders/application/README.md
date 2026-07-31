# Orders application

Application cases authorize through the actor's explicit permissions and derive
customer identity only from `actor.customerId`. The catalog resolver receives
the complete actor and returns the only product and price data accepted for a
line snapshot.

Create persists an empty draft. Update replaces all lines atomically after all
catalog resolutions succeed. Read cases enforce permission and ownership.
The approved workflow definition is centralized under `workflow/`.
`SubmitOrderUseCase` implements only `DRAFT` to `SUBMITTED` through the shared
process factory and Platform `StateTransition`. `ResubmitOrderUseCase` implements
only `CHANGES_REQUESTED` to `SUBMITTED` with `orders.resubmit`. There is no
`StartReviewOrderUseCase` implements only `SUBMITTED` to `UNDER_REVIEW` with
`orders.start_review`; it does not require actor customer context or ownership.
There is no inventory, HTTP, framework, ERP, or concrete persistence code in
Application.
