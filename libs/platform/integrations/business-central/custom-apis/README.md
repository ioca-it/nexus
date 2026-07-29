# Business Central custom API contracts

These contracts describe the two read-only API Pages that NEXUS requires
beyond the standard Business Central API:

- open customer receivables;
- ERP-approved inventory availability.

They contain only transport-neutral record validation, configurable API Page
metadata, exact fields, mandatory filter capabilities, and implementation
guidance. They do not implement HTTP, AL, deployment, authentication, gateways,
repositories, or synchronization.

## Ownership and boundaries

- Business Central owns receivables, official balances, payment application,
  physical inventory, and approved availability.
- Dataverse owns products and commercial data such as name, description,
  category, image, and price.
- Payment Notifications are customer-submitted notices, not official payments.
  NEXUS does not post or apply payments and does not calculate ERP balances.
- `availableQuantity` is distinct from physical `inventoryQuantity`; only the
  Business Central functional owner may approve its calculation.

The metadata shape follows Microsoft API Page properties while keeping all real
values environment-configurable. Read-only AL implementations must disable
insert, modify, and delete explicitly. The child READMEs are the authoritative
AI implementation contracts and identify every unresolved functional decision.
