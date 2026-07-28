# API authentication

`JwtStrategy` mantiene separadas tres responsabilidades:

1. Passport/JWKS valida firma, expiración, audiencia e issuer del JWT entrante.
2. `validate()` exige los claims `sub`, `tid` y `oid`, y usa exclusivamente
   `oid` para resolver una vez el actor empresarial mediante
   `AuthenticatedActorResolver`.
3. Los guards de autorización consumen el actor resuelto; `RolesGuard` lee
   exclusivamente `request.user.actor.roles`.

Passport recibe un `AuthenticatedRequestUser` congelado con `oid`, `sub`, `tid`
y el `AuthenticatedActor` inmutable. No se incluyen access tokens ni se
infieren permisos, roles o identidad desde otros claims.

Un usuario ausente o inactivo produce una respuesta no autorizada genérica. Los
errores técnicos de resolución producen un error interno seguro y no se
presentan como usuario inexistente.

## Acceso tipado en controllers

`@CurrentUser()` devuelve exclusivamente la referencia `request.user` creada
por Passport a partir del resultado de `JwtStrategy`. `@CurrentActor()` devuelve
exclusivamente la referencia `request.user.actor`.

Ambos decoradores leen el request mediante `ExecutionContext.switchToHttp()` y
rechazan de forma genérica las solicitudes que no contienen los datos
autenticados requeridos. No leen identidad desde body, params, query o headers;
tampoco decodifican JWT, resuelven actores, consultan Dataverse ni validan
permisos.
