# Finance infrastructure

Infrastructure adapts the existing Business Central invoice and credit memo
gateways to Finance repositories. It also provides a Dataverse query gateway
and resolver for the configured NEXUS-to-Business-Central customer reference.

No client, authentication mechanism, controller, provider or write operation is
defined here. Physical Dataverse names arrive through the schema dependency.
