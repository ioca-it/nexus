# Dataverse Web API Payment Notification Gateway

This gateway translates configured payment-notification persistence records
into generic Dataverse client operations. Entity-set and field names are
supplied through `DataversePaymentNotificationSchema`; no physical names are
embedded in the implementation.

Creates and replacements are submitted only through one `executeAtomic()` call.
A replacement updates the notification, deletes its existing invoice
relationships, and creates its current relationships in the same atomic batch.

Reads validate required physical fields before rebuilding persistence records.
Multi-notification searches issue one grouped invoice query using the configured
relationship field and a readonly array of notification IDs, avoiding N+1
queries.

Authentication, tokens, HTTP transport, NestJS integration, and Business
Central access remain outside this gateway.
