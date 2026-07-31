# Resubmit order

`ResubmitOrderUseCase` performs only the
`CHANGES_REQUESTED` to `SUBMITTED` transition for `orders.resubmit`. It loads
the order once, requires explicit permission and exact customer ownership, and
delegates workflow evaluation through the shared `createOrderProcessRequest()`
factory and Platform `StateTransition`.

Resubmit requires no approval group. A denied or invalid pipeline result
returns the original order without clock, domain transition, or persistence. An
allowed result must specify `requireApproval: false` and `nextState: SUBMITTED`.
The successful path creates a new immutable order, preserves its commercial
snapshot, awaits one repository update, and performs no catalog, inventory,
ERP, notification, or HTTP work.
