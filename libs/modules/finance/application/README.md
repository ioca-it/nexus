# Finance application

The application layer authorizes read operations and coordinates domain
repositories with `CustomerBusinessCentralReferenceResolver`.

The resolver receives a `NexusCustomerId`, whose authorized source is
NEXUS/Dataverse, and returns the linked `BusinessCentralCustomerId`. A missing
link is denied; identity equality is never inferred.

Get-by-id operations return `null` when the repository has no document. Actors
with customer context must additionally resolve and match the Business Central
customer reference. Actors with `customerId: null` may read by ID only with the
explicit Finance permission. Customer list operations never accept an external
customer identifier and always derive it from the actor through the resolver.

No infrastructure adapter, HTTP endpoint, framework provider, write operation,
receivable or payment behavior is included.
