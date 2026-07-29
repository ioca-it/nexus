# Open customer receivables custom API

This contract specifies the read-only Business Central API Page required to
expose open customer entries to NEXUS. Runtime configuration must supply
`publisher`, `group`, `version`, `entityName`, and `entitySetName`; this
repository deliberately contains no deployed route, AL object ID, tenant,
environment, company, or credential.

The expected functional source is posted customer-ledger information owned by
Business Central. Microsoft's `Cust. Ledger Entry` documentation confirms the
relevant concepts, including customer number, document classification, posting
and due dates, amount, remaining amount, currency, and open state. The AL
implementation must validate the definitive source and field calculation with
the Business Central owner; this contract does not freeze a table or AL design.

## AI implementation contract

- **Purpose:** return Business Central customer receivables, never NEXUS
  Payment Notifications or payment projections.
- **Exact fields:** `id`, `customerId`, `documentType`, `documentNumber`,
  `postingDate`, optional `dueDate`, `originalAmount`, `remainingAmount`,
  optional `currencyCode`, `open`, and optional `lastModifiedDateTime`.
- **Required filters:** `customerId` and `open`; `open=true` must return only
  entries that Business Central still considers open.
- **Field semantics:** `customerId` is the real Business Central customer
  identifier; document type/number preserve ERP classification; original and
  remaining amounts come from Business Central without NEXUS recalculation.
- **Read-only rule:** the future API Page must disable insert, modify, and
  delete. It must not apply payments, close entries, or change balances.
- **Do not expose:** bank information, application details, document lines,
  internal users, unrelated dimensions, or other sensitive data.
- **Pending functional dependencies:** confirm the definitive posted-ledger
  source, stable `id`, amount calculation/FlowFields, currency behavior, and
  optional modification timestamp with the Business Central owner.
- **Minimum future AL tests:** exact metadata and field names; all three write
  operations disabled; filters by customer and open state; closed entries
  excluded; ERP amounts preserved; optional values represented correctly; no
  extra sensitive fields; stable identifiers and paging behavior.
- **Future NEXUS consumers:** the pending
  `gateways/receivables/business-central-receivable.gateway.ts` implementation
  will validate records with `validateReceivableApiRecord` and convert ISO date
  strings to the existing `BusinessCentralReceivable` model.

Official references:

- [API page type](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-api-pagetype)
- [Cust. Ledger Entry table](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.receivables.cust.-ledger-entry)
- [API/OData filtering](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-connect-apps-filtering)
