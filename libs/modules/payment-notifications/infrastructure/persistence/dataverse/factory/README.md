# Dataverse Payment Notification Repository Factory

`createDataversePaymentNotificationRepository()` is the infrastructure
composition root for Payment Notifications persistence. It connects:

1. `FetchDataverseClient`
2. `DataverseWebApiPaymentNotificationGateway`
3. `PaymentNotificationMapper`
4. `DataversePaymentNotificationRepository`

The factory validates its required dependencies and otherwise delegates all
behavior to those existing components. A supplied `idGenerator` configures a
dedicated mapper; without one, the existing default mapper is used.

The factory does not read environment variables, acquire access tokens, define
physical Dataverse names, or depend on NestJS. The caller supplies the Web API
base URL, token callback, and schema from its own composition layer.
