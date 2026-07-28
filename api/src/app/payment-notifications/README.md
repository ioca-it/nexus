# Payment Notifications Composition

El módulo compone el repositorio Dataverse y los ocho casos de uso como
singletons. Las fábricas de `validate`, `reject` y `request_changes` reciben
exclusivamente los grupos de su acción desde
`config.paymentNotifications.approvals`.

Los casos transicionales reciben el actor en cada solicitud futura; la
composición no resuelve actores, no solicita tokens y no consulta Dataverse al
iniciar.

Create Draft y Update también reciben el actor durante la ejecución. Sus
providers no requieren configuración adicional: la autorización y el
aislamiento por cliente permanecen dentro de Application.

Los controllers iniciales publican únicamente estas rutas autenticadas:

- `GET /payment-notifications`
- `GET /payment-notifications/:id`
- `POST /payment-notifications`
- `PATCH /payment-notifications/:id`
- `POST /payment-notifications/:id/submit`
- `POST /payment-notifications/:id/resubmit`
- `GET /admin/payment-notifications/:id`
- `GET /admin/payment-notifications/customer/:customerId`
- `POST /admin/payment-notifications/:id/start-review`
- `POST /admin/payment-notifications/:id/validate`
- `POST /admin/payment-notifications/:id/reject`
- `POST /admin/payment-notifications/:id/request-changes`

El actor se obtiene mediante `CurrentActor`. Create Draft genera el identificador
con el provider interno `PAYMENT_NOTIFICATION_ID_GENERATOR`; ningún endpoint
acepta `customerId`, identidad empresarial ni permisos desde la solicitud.
Todas las respuestas pasan por `toPaymentNotificationResponse`.

Las consultas reutilizan los Query Use Cases de Application y la acción
explícita `read`. El listado del cliente deriva `customerId` exclusivamente del
actor; únicamente el listado administrativo recibe un cliente mediante la
ruta.
