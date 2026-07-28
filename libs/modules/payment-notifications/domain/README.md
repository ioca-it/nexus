# Payment Notifications Domain

Define el modelo de dominio inmutable para registrar notificaciones de pago,
sin infraestructura, persistencia ni lógica de aplicación.

## Aplicación de estados autorizados

`PaymentNotification.transitionTo(nextStatus, updatedAt)` crea una nueva entidad
con el estado previamente autorizado por el Workflow Engine. Conserva la
instancia original y todos sus datos, mantiene `createdAt` y actualiza
`updatedAt` mediante una copia defensiva.

La operación valida únicamente invariantes propias de la entidad: que el estado
pertenezca a `PaymentNotificationStatus` y que `updatedAt` no sea anterior a
`createdAt`. No decide si una transición está permitida, no reproduce reglas del
workflow y no ejecuta Platform.
