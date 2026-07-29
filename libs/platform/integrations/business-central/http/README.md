# Business Central HTTP

Cliente genérico de solo lectura para la API estándar de Business Central. La
URL base sigue la estructura oficial:

```text
<resourceUrl>/<tenantId>/<environmentName>/api/<apiVersion>/companies(<companyId>)
```

`FetchBusinessCentralClient` admite únicamente `getOne` y `query`, usa `fetch`
nativo o inyectado y obtiene tokens mediante una función delegada. Una consulta
paginada reutiliza el mismo token y sigue `@odata.nextLink` solamente cuando
permanece en el origin y la ruta de compañía configurados.

## External System Contracts

`ExternalSystemClient` define una única operación `execute(ExternalRequest)`.
Este cliente expone dos operaciones HTTP con resultados distintos, por lo que
no implementa ese contrato: hacerlo requeriría un método ficticio o perder
tipado. Un adaptador futuro podrá unir ambos límites cuando exista una operación
externa concreta.

El cliente no conoce entidades, credenciales, configuración global, NestJS ni
módulos de negocio. No implementa escrituras, retries, logging o telemetría.
