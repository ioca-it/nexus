# Orders composition

Orders composes the shared Dataverse client, configurable Orders schemas, Orders gateways/repository, the Commercial Catalog item use case, one clock, and four DRAFT use cases. Only the four use-case tokens are exported. The resolver creates an authorization snapshot from Commercial Catalog and deliberately excludes `ecommerceUrl`, inventory, and internal price fields.

## AI maintenance map

Update `orders.tokens.ts` and `orders.providers.ts` to register a use case; update Orders domain/application first for persisted fields or snapshot changes; update the Orders infrastructure schema adapter for persistence; add controllers only in a later approved increment. Submit, workflow, later states, inventory, taxes, discounts and credit remain pending.

HTTP exposes POST `/orders`, PUT `/orders/:orderId/lines`, GET `/orders`, and GET `/orders/:orderId`. `CurrentActor` is the only identity source; `ecommerceUrl` is obtained from Commercial Catalog and is not part of Order responses.
