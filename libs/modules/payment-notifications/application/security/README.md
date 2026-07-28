# Payment Notification Access Policy

Política pura para combinar permisos explícitos del actor con aislamiento por
`customerId`. Reutiliza el Permissions Engine de Platform, mantiene denegación
predeterminada y no concede acceso desde roles.

Un actor con `customerId` solo accede a recursos del mismo cliente. Un actor
con `customerId: null` necesita igualmente el permiso explícito solicitado.
`requireCustomer` se usa cuando la operación necesita obligatoriamente un
cliente, como `create_draft`.
