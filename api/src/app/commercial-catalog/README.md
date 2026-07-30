# Commercial Catalog composition

This NestJS composition root wires the Dataverse read infrastructure to the
Commercial Catalog application use cases. Domain and Application remain the
authoritative sources for catalog behavior.

## AI maintenance map

| HTTP route                                    | Use-case token / mapper                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `GET /commercial-catalog`                     | `LIST_CUSTOMER_CATALOG_USE_CASE` → `toCatalogItemResponse()`     |
| `GET /commercial-catalog/products/:productId` | `GET_CUSTOMER_CATALOG_ITEM_USE_CASE` → `toCatalogItemResponse()` |
| Product gateway                               | `config.dataverse.commercialCatalog.schema.product`              |
| Customer price gateway                        | `config.dataverse.commercialCatalog.schema.customerPrice`        |

Only the two use-case tokens are exported. The Dataverse client, gateways,
repositories, clock, access-token provider, and schemas remain internal.
`controllers/commercial-catalog.controller.ts` delegates only to those use
cases. HTTP responses deliberately exclude customer and internal price IDs,
active flags, permissions, inventory, availability, costs, margins, and taxes.

To add a use case, add its token and provider, then export it only when another
module must consume it. Add repository composition in
`commercial-catalog.providers.ts`. Add a response field through `contracts/`,
`mappers/`, and their tests after the corresponding Domain field is approved.
Add a query through Application and then expose it from the controller.
Inventory remains pending and must be connected separately only after its
approved Business Central API and application contracts exist.
