# Orders

Orders owns the NEXUS draft-order Domain and Application behavior. A customer
is one company, every customer-scoped operation derives that company from
`AuthenticatedActor.customerId`, and Dataverse is the authoritative future
persistence source for orders.

Commercial Catalog is the authoritative source for products and
customer-authorized prices. An order line stores an immutable snapshot of the
resolved product number, name, unit of measure, currency, and unit price.
Requests cannot supply those commercial values. Business Central inventory is
not consulted in this increment.

The approved lifecycle is centralized in `application/workflow/order-workflow.ts`:
`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CHANGES_REQUESTED`, `REJECTED`, and
`APPROVED`. Only DRAFT and CHANGES_REQUESTED are line-editable. The only
implemented transition cases are `SubmitOrderUseCase` for `DRAFT` to
`SUBMITTED` and `ResubmitOrderUseCase` for `CHANGES_REQUESTED` to `SUBMITTED`;
`StartReviewOrderUseCase` for `SUBMITTED` to `UNDER_REVIEW`; other transition
cases and all endpoints remain pending. Approval groups are supplied by Config
per action.

Amounts use one deterministic two-decimal rounding function in
`domain/order-money.ts`. Advanced monetary precision and currencies with a
different number of decimal places require a later approved decision.

## AI maintenance map

| Concern                                  | Authoritative files                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Order identity and status                | `domain/order.types.ts`, `domain/order-status.ts`                                                                                       |
| Order and subtotal invariants            | `domain/order.ts`, `domain/order-money.ts`                                                                                              |
| Line snapshot and subtotal               | `domain/order-line.ts`                                                                                                                  |
| Persistence port                         | `domain/repositories/order.repository.ts`                                                                                               |
| Catalog snapshot port                    | `application/catalog/order-catalog-resolver.ts`                                                                                         |
| Permissions and ownership                | `application/security/order-access-policy.ts`                                                                                           |
| Create and edit behavior                 | `application/use-cases/create-*`, `update-*`                                                                                            |
| Read behavior                            | `application/use-cases/get-*`, `list-*`                                                                                                 |
| Future Dataverse implementation          | `infrastructure/`                                                                                                                       |
| Future inventory composition             | a separately approved Business Central adapter increment                                                                                |
| Workflow transitions                     | `application/workflow/order-workflow.ts`                                                                                                |
| Process request shape                    | `application/process/order-process-request.factory.ts`                                                                                  |
| Submit semantics and orchestration       | `application/workflow/order-workflow.ts`, `application/process/order-process-request.factory.ts`, `application/use-cases/submit/`       |
| Resubmit semantics and orchestration     | `application/workflow/order-workflow.ts`, `application/process/order-process-request.factory.ts`, `application/use-cases/resubmit/`     |
| Start review semantics and orchestration | `application/workflow/order-workflow.ts`, `application/process/order-process-request.factory.ts`, `application/use-cases/start-review/` |

Domain and Application are the authoritative sources for Orders behavior.

- To add an order field, update the Domain model/factory, repository contract
  when persistence is affected, public exports, and focused tests together.
- To add a line rule, change `domain/order-line.ts` and its tests; keep monetary
  rounding centralized.
- To add a status after approval, update `domain/order-status.ts`, define its
  invariants and workflow in a separate increment, then add transition tests.
- To connect Dataverse, implement `OrderRepository` under `infrastructure/`
  without moving authorization or domain rules into the adapter.
- To connect future inventory, add a separate Business Central port and
  application composition only after the custom API and availability formula
  are approved. Do not add inventory fields to the current order snapshot.

Approval groups are configured independently for request_changes, reject and
approve. The process-request factory receives those values; Application never
reads environment variables directly.

The `submit` action is authorized by the explicit `orders.submit` permission
and exact `customerId` ownership. It changes only `status` from `DRAFT` to
`SUBMITTED` and `updatedAt`, requires no approval (`requireApproval=false`), and
does not consult inventory or ERP. If submit semantics change, update the
workflow, process-request factory, `application/use-cases/submit/`, their tests,
and this maintenance map together. Do not duplicate `ORDER_WORKFLOW`.

The `resubmit` action is authorized by the explicit `orders.resubmit` permission
and exact `customerId` ownership. It changes only `status` from
`CHANGES_REQUESTED` to `SUBMITTED` and `updatedAt`, requires no approval
(`requireApproval=false`), and does not revalidate prices or consult inventory
or ERP. If resubmit semantics change, update the workflow, process-request
factory, `application/use-cases/resubmit/`, its tests, and this maintenance map
together. Do not duplicate `ORDER_WORKFLOW`.

The `start_review` action is authorized by the explicit
`orders.start_review` permission. It changes only `status` from `SUBMITTED` to
`UNDER_REVIEW` and `updatedAt`, requires no approval (`requireApproval=false`),
and does not require actor customer context or ownership. It does not consult
inventory, catalog, or ERP. If start-review semantics change, update the
workflow, process-request factory, `application/use-cases/start-review/`, its
tests, and this maintenance map together. Do not duplicate `ORDER_WORKFLOW`.

Keep changes small and reversible: extend the relevant authoritative boundary,
its exports, and its tests in the same change. Never bypass permissions,
customer ownership, catalog authorization, or domain factories.
