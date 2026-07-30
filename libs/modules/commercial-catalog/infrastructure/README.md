# Commercial Catalog infrastructure

The Dataverse read adapters live in `dataverse/`. They consume an injected
structural client and configured physical schema; this module does not construct
HTTP clients, credentials, or framework providers. Business Central inventory
integration remains deliberately absent.
