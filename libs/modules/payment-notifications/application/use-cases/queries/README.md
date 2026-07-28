# Payment Notification Queries

Consultas autenticadas sin paginación ni filtros. Todas evalúan el permiso
explícito `read` mediante la política de acceso existente.

La lectura de cliente por ID exige coincidencia de `customerId`; su listado
deriva el cliente exclusivamente del actor. La lectura administrativa por ID y
el listado administrativo por cliente no aplican coincidencia de cliente, pero
siguen requiriendo permiso explícito.
