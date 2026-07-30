# Commercial Catalog HTTP controller

`CommercialCatalogController` exposes two authenticated read routes. Identity
comes only from `CurrentActor`; the controller delegates authorization,
customer scoping, and price selection to application use cases. It does not
read repositories, gateways, query parameters, request bodies, or custom
headers.
