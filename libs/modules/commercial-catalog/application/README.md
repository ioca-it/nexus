# Commercial Catalog application

The application layer authorizes reads using the actor's explicit permissions,
derives the commercial customer exclusively from `actor.customerId`, and
coordinates abstract product and customer-price repositories.

Price validity uses an injected `CatalogClock`. Use cases do not accept customer
identifiers or prices from requests, calculate prices or discounts, inspect
roles, or query inventory.
