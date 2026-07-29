# Inventory availability custom API

This contract specifies the read-only Business Central API Page required to
return inventory availability to NEXUS. Dataverse remains the authoritative
source for product identity and commercial presentation; this API contains only
inventory data.

Runtime configuration must supply `publisher`, `group`, `version`,
`entityName`, and `entitySetName`. No AL object ID, deployed route, tenant,
environment, company, or credential is fixed here.

## Availability calculation decision

`availableQuantity` is mandatory, but its calculation is intentionally pending
approval from the functional Business Central owner. Before AL implementation,
the owner must decide which components and scopes participate, including:

- physical inventory;
- reserved quantities;
- outstanding sales orders;
- transfers;
- pending receipts;
- included locations and warehouse/bin rules;
- blocked items, variants, lots, serial numbers, or bins;
- base, sales, and alternate units of measure.

No formula is approved by this contract. In particular,
`inventoryQuantity`—when present—means physical stock and must never be copied
or relabeled as `availableQuantity`. Microsoft documentation distinguishes
quantity on hand, projected available balance, item-tracking availability, and
warehouse availability, each with different inputs.

## AI implementation contract

- **Purpose:** return ERP-approved sellable availability for Business Central
  items without duplicating Dataverse product data.
- **Exact fields:** `itemId`, `itemNumber`, mandatory `availableQuantity`,
  optional `inventoryQuantity`, optional `unitOfMeasureCode`, and optional
  `lastModifiedDateTime`.
- **Required filter:** `itemId`. The API must accept a grouped filter containing
  multiple item IDs so NEXUS can avoid N+1 requests.
- **Field semantics:** every record identifies its own item; response position
  has no relational meaning. `inventoryQuantity` is physical stock, while
  `availableQuantity` follows the separately approved ERP rule.
- **Read-only rule:** the future API Page must disable insert, modify, and
  delete and must not reserve, transfer, post, or adjust inventory.
- **Do not expose:** name, description, category, images, prices, costs,
  margins, individual reservations, or sensitive warehouse details.
- **Pending functional dependencies:** approve the availability formula,
  locations, warehouse configuration, blocking, time horizon, and unit of
  measure before selecting the definitive AL source and calculation.
- **Minimum future AL tests:** exact metadata and field names; all writes
  disabled; mandatory availability calculation; grouped item filtering;
  response records keyed by `itemId`; physical stock kept distinct; unit
  conversion follows the approved rule; blocked/location scenarios; no
  commercial or financial fields; paging behavior.
- **Future NEXUS consumers:** the pending
  `gateways/inventory/business-central-inventory.gateway.ts` implementation
  will validate records with `validateInventoryAvailabilityApiRecord`, map
  `lastModifiedDateTime` to `lastModifiedAt`, and preserve the existing
  `BusinessCentralInventoryItem` contract.

Official references:

- [API page type](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-api-pagetype)
- [Standard item resource](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_item)
- [Item availability overview](https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-availability-overview)
- [Warehouse availability](https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-availability-in-the-warehouse)
