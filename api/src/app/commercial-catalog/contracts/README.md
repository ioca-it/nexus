# Commercial Catalog HTTP contracts

These readonly response contracts expose only approved commercial product and
customer-price fields. Customer identifiers, internal price identifiers,
active flags, inventory, availability, costs, margins, taxes, permissions, and
technical metadata remain excluded.

`CatalogProductResponse.ecommerceUrl` is optional and contains only the exact
HTTPS URL validated by Commercial Catalog Domain. Contracts do not generate
HTML, tracking parameters, or enriched links.
