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

`DRAFT` is the only approved order status. Submission, approval, the complete
workflow, inventory, taxes, discounts, promotions, credit, shipping, invoicing,
and synchronization remain deliberately pending.

Amounts use one deterministic two-decimal rounding function in
`domain/order-money.ts`. Advanced monetary precision and currencies with a
different number of decimal places require a later approved decision.

## AI maintenance map

| Concern                         | Authoritative files                                      |
| ------------------------------- | -------------------------------------------------------- |
| Order identity and status       | `domain/order.types.ts`, `domain/order-status.ts`        |
| Order and subtotal invariants   | `domain/order.ts`, `domain/order-money.ts`               |
| Line snapshot and subtotal      | `domain/order-line.ts`                                   |
| Persistence port                | `domain/repositories/order.repository.ts`                |
| Catalog snapshot port           | `application/catalog/order-catalog-resolver.ts`          |
| Permissions and ownership       | `application/security/order-access-policy.ts`            |
| Create and edit behavior        | `application/use-cases/create-*`, `update-*`             |
| Read behavior                   | `application/use-cases/get-*`, `list-*`                  |
| Future Dataverse implementation | `infrastructure/`                                        |
| Future inventory composition    | a separately approved Business Central adapter increment |

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

Keep changes small and reversible: extend the relevant authoritative boundary,
its exports, and its tests in the same change. Never bypass permissions,
customer ownership, catalog authorization, or domain factories.
