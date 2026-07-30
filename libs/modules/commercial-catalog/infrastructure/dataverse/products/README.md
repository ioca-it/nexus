# Dataverse catalog products

`DataverseCatalogProductGateway` reads configured physical product records and
validates them before exposure. `DataverseCatalogProductRepository` maps those
records through `createCatalogProduct()`. Product reads contain no prices,
inventory, costs, or margins and expose no write operations.

`ecommerceUrl` is an optional informational Dataverse field. The gateway uses
only its configured physical name, normalizes missing or empty values to
`undefined`, and applies the shared Domain HTTPS policy before mapping.

The injected client does not currently support `$select`; the gateway does not
replace or extend that shared transport.
