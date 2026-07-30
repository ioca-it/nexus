# Commercial Catalog Dataverse infrastructure

This infrastructure reads Dataverse-owned products and customer-specific prices
through an injected client compatible with `findOne` and `query`. It consumes
`config.dataverse.commercialCatalog.schema` without renaming or fixing physical
entity and field names.

The current shared client supports equality filters but no `$select` or
compound OR expressions. Product and price queries therefore request records
through that existing contract. Price queries apply customer and active filters
in Dataverse once, then evaluate optional `validFrom` and `validTo` bounds over
the single validated collection in memory. Empty optional physical strings are
normalized to `undefined`.

Multiple effective prices for the same customer and product are a configuration
inconsistency and are never selected arbitrarily. Domain creation remains
authoritative in `createCatalogProduct()` and `createCustomerPrice()`.

## AI maintenance map

| Concern                       | Authoritative files                                     |
| ----------------------------- | ------------------------------------------------------- |
| Physical records and schemas  | `common/commercial-catalog-dataverse.types.ts`          |
| Physical validation           | `common/commercial-catalog-dataverse.validators.ts`     |
| Product gateway and mapping   | `products/dataverse-catalog-product.gateway.ts`, mapper |
| Product repository            | `products/catalog-product.repository.ts`                |
| Price gateway and validity    | `customer-prices/dataverse-customer-price.gateway.ts`   |
| Price mapping and repository  | `customer-prices/customer-price.mapper.ts`, repository  |
| Physical schema configuration | `@nexus/config` Commercial Catalog Dataverse schema     |

To add a physical field, update Config, the structural schema, validator,
mapper, and their tests together. Change validity only in the price gateway and
retain the explicit application clock input. Add a query through the gateway
contract without extending the client unless separately approved. Future
inventory belongs to a distinct Business Central adapter and composition step,
not these records.

This infrastructure is read-only. Do not add create, update, delete, price
calculation, authorization, inventory, or Dataverse writes without an approved
architectural decision.
