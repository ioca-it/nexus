# Dataverse Payment Notification Repository

`DataversePaymentNotificationRepository` adapts the domain repository contract
to an injected `DataversePaymentNotificationGateway`.

The repository delegates physical I/O to the gateway and uses the persistence
mapper for every domain conversion. `update()` calls `replace()`, which
represents a complete logical replacement of the notification record and its
invoice relationship records.

The gateway is intentionally transport-agnostic. This layer does not implement
HTTP, authentication, physical Dataverse table names, Business Central access,
or NestJS integration.
