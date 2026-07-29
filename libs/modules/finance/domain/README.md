# Finance domain

Finance owns immutable read models for invoices and sales credit memos. Business
Central is the authorized source for those documents, but the domain does not
depend on its HTTP client, gateways, physical records or field names.

`NexusCustomerId` identifies the customer owned by NEXUS/Dataverse.
`BusinessCentralCustomerId` identifies the corresponding customer in Business
Central. They are nominally distinct and must be connected through the
application reference resolver; equality between them is never inferred.

The domain does not contain document lines, receivables, payments,
authorization or write behavior.
