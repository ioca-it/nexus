# Start review order

`StartReviewOrderUseCase` performs only the `SUBMITTED` to `UNDER_REVIEW`
transition for `orders.start_review`. It requires the explicit permission, but
does not require actor customer context or ownership. Workflow evaluation is
delegated to the shared `createOrderProcessRequest()` factory and Platform
`StateTransition`.

The transition does not require an approval group. Denied or invalid pipeline
results return the original order without clock, domain transition, or
persistence. An allowed result must specify `requireApproval: false` and
`nextState: UNDER_REVIEW`. The successful path preserves the immutable
commercial snapshot and performs no catalog, inventory, ERP, notification, or
HTTP work.
