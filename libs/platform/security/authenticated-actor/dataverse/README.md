# Dataverse Authenticated Actor

Adaptador server-side que materializa `AuthenticatedActorResolver` con datos
explícitos de Dataverse.

El flujo tiene tres responsabilidades:

1. `DataverseAuthenticatedActorGateway` consulta un usuario por `oid` y devuelve
   `null` cuando no existe o está inactivo. Para un usuario activo, carga roles,
   permisos y membresías en tres consultas agrupadas y concurrentes.
2. `toAuthenticatedActor` transforma los tipos físicos de persistencia usando
   exclusivamente `createAuthenticatedActor`.
3. `DataverseAuthenticatedActorResolver` valida el `oid`, delega la carga y
   devuelve el actor sin modificarlo.

El gateway recibe por inyección la operación `query` que ya proporciona
`DataverseClient`; no implementa HTTP ni autenticación. También recibe
`DataverseAuthenticatedActorSchema`, por lo que ningún nombre físico de entidad
o campo queda fijado en el adaptador. La configuración de ese schema corresponde
al composition root cuando esté disponible.
