# Commercial Catalog

Commercial Catalog provides the domain and application contracts for
customer-authorized product and price reads. Dataverse is the source of truth
for both products and customer-specific prices. A user belongs to one NEXUS
customer company, and use cases derive that customer only from the authenticated
actor.

Prices are selected by repositories using an explicit `asOf` value. NEXUS does
not derive prices, calculate discounts, taxes, or currency conversions.
Business Central inventory availability is deliberately pending and is not part
of these models or use cases.

## AI maintenance map

| Concern                             | Authoritative files                                            |
| ----------------------------------- | -------------------------------------------------------------- |
| Product model and fields            | `domain/product.ts`                                            |
| Ecommerce URL safety policy         | `domain/safe-ecommerce-url.ts`                                 |
| Customer price model and invariants | `domain/customer-price.ts`                                     |
| Product-price relationship          | `domain/catalog-item.ts`                                       |
| Product and price persistence ports | `domain/repositories/`                                         |
| Permissions                         | `application/security/commercial-catalog-access-policy.ts`     |
| Customer catalog listing            | `application/use-cases/list-customer-catalog.use-case.ts`      |
| Single product lookup               | `application/use-cases/get-customer-catalog-item.use-case.ts`  |
| Future Dataverse connection         | `infrastructure/`                                              |
| Future Business Central inventory   | a separate inventory adapter and catalog composition increment |

Frozen boundaries:

- products and customer prices come from Dataverse;
- Dataverse supplies the optional ecommerce URL exactly as stored after HTTPS
  safety validation; NEXUS never constructs or enriches it;
- customer identity always comes from `AuthenticatedActor.customerId`;
- only explicit permissions authorize reads; roles and `Nexus.Admin` do not;
- products without an active authorized customer price are not visible;
- duplicate active prices for one customer/product are inconsistent;
- price, inventory, discounts, taxes, and currency are never inferred.

To add a product field, update the product model, factory, repository mapping
contract, and domain tests. To add a price rule, start with the CustomerPrice
invariant and repository contract. New query cases belong in
`application/use-cases`; concrete Dataverse code belongs only in
`infrastructure`. Inventory must remain a separate Business Central concern
until its approved contract is composed later.

`CatalogProduct.ecommerceUrl` is informational and intentionally excluded from
Orders, `OrderLine`, and the persisted catalog snapshot. The future order form
must read it from Commercial Catalog. If URL policy changes, update
`domain/safe-ecommerce-url.ts`, the Dataverse validator, response mapper,
documentation, and their focused tests together.
