# Authenticated Actor composition

`AuthenticatedActorModule` registra una composición singleton para resolver
actores autorizados desde Dataverse:

```text
FetchDataverseClient
  -> DataverseAuthenticatedActorGateway
  -> DataverseAuthenticatedActorResolver
```

El módulo importa `DataverseModule` para consumir su
`DATAVERSE_ACCESS_TOKEN_PROVIDER` transversal. No crea autenticación saliente,
realiza llamadas HTTP ni solicita tokens durante la composición, y no depende
de Payment Notifications.

Sólo `AUTHENTICATED_ACTOR_RESOLVER` se exporta para módulos consumidores.
