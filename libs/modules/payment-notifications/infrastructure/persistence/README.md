# Payment Notification Persistence Contracts

These readonly contracts describe physical persistence records. They are not
domain entities and contain no business behavior.

`PaymentNotificationRecord` stores the payment notification fields. Its
`paymentDate`, `createdAt`, and `updatedAt` values are ISO 8601 strings.

Invoice associations are stored exclusively as separate
`PaymentNotificationInvoiceRecord` rows. Each row relates a payment
notification to an `invoiceId`, which is only a Business Central reference.
Financial invoice data is not duplicated, and `invoiceIds` are not embedded in
the payment notification record.

This layer does not yet provide Dataverse models, repository implementations,
mapping logic, or persistence behavior.
