# Dataverse catalog products

`DataverseCatalogProductGateway` reads configured physical product records and
validates them before exposure. `DataverseCatalogProductRepository` maps those
records through `createCatalogProduct()`. Product reads contain no prices,
inventory, costs, or margins and expose no write operations.

The injected client does not currently support `$select`; the gateway does not
replace or extend that shared transport.
