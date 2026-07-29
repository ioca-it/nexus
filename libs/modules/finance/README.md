# Finance

Finance is an Nx library containing framework-independent domain read models
and application use cases for invoices and sales credit memos.

- Dataverse is the authorized source for NEXUS customer identity.
- Business Central is the authorized source for invoices and credit memos.
- `actor.customerId` is a NEXUS identifier and is never compared directly with
  a Business Central customer identifier.

Infrastructure adapters map the existing Business Central read gateways to
Finance repositories and resolve customer references through the existing
Dataverse query surface. Composition remains the responsibility of a future
increment.

The module contains no controllers, endpoints, NestJS providers, writes,
synchronization, receivables, inventory or payments.
