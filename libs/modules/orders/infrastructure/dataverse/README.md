# Orders Dataverse infrastructure

Dataverse is the authorized persistence source for Orders. This adapter stores only DRAFT orders and their order-line fields defined by the domain. Physical entity-set and column names are supplied by `DataverseOrdersSchema`; no physical names are embedded here.

The gateways expose only `findOne`, `query`, `create`, and `update`. There is deliberately no delete operation, external client, controller, provider, workflow, inventory, or Business Central integration in this increment. Mappers recreate aggregates through the domain factories and verify persisted subtotals.

## AI maintenance map

- Add a field: update the domain, `OrderRecord`/`OrderLineRecord`, schema, mapper, gateway projection, and tests in this folder.
- Change persistence: update only the schema/gateway and mapper contract; keep physical names in Config when that configuration is introduced.
- Add a future state: obtain explicit domain approval first, then update domain status, mapper validation, tests, and documentation. Do not add workflow here.
- `ecommerceUrl`, inventory, authorization snapshots, and actor data remain outside Orders and are never persisted by this adapter.
