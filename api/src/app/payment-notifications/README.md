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
