# Dataverse composition

`DataverseModule` es el propietario transversal de la autenticación saliente
para Dataverse en la API.

Registra una instancia singleton de `AzureAccessTokenProvider` y una instancia
singleton de `DataverseAccessTokenProvider`. Exporta sus tokens para los módulos
consumidores, sin crear clientes HTTP ni solicitar tokens durante la
composición.

`createDataverseBaseUrl` normaliza la URL del entorno y la versión del API para
producir `<environmentUrl>/api/data/<apiVersion>`.
