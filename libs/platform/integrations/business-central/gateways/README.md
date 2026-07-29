# Business Central read gateways

Estos gateways son adaptadores de infraestructura de solo lectura. Reciben
`BusinessCentralHttpClient`, validan cada registro externo y devuelven modelos
normalizados e inmutables. No conocen NestJS, Dataverse, permisos, workflows,
casos de uso ni entidades de dominio.

## Recursos estándar confirmados

La implementación usa exclusivamente la API estándar v2.0 documentada por
Microsoft:

- [`salesInvoices`](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_salesinvoice):
  `id`, `number`, `customerId`, `customerNumber`,
  `invoiceDate`, `dueDate`, `currencyCode`, `totalAmountIncludingTax`,
  `remainingAmount` y `status`.
- [`salesCreditMemos`](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_salescreditmemo):
  `id`, `number`, `customerId`, `customerNumber`,
  `creditMemoDate`, `currencyCode`, `totalAmountIncludingTax` y `status`.
- [`items`](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_item)
  confirma `id`, `number`, `inventory`, `baseUnitOfMeasureCode` y
  `lastModifiedDateTime`, pero no expone cantidad disponible.

`remainingAmount` no está documentado para `salesCreditMemos`, por lo que el
gateway no lo solicita ni lo supone. El contrato lo conserva como opcional para
una futura API page.

## API pages personalizadas pendientes

La API estándar v2.0 no contiene un recurso de partidas de cliente con todos
los campos requeridos por `BusinessCentralReceivable`: identificador de
cliente, tipo y número de documento, fechas, importe original, saldo restante,
moneda y estado abierto. Se necesita una API page personalizada de solo lectura
que exponga esos campos y permita filtrar por `customerId` y `open`.

El recurso estándar `items` expone existencia física (`inventory`), no
`availableQuantity`. Como ambos conceptos no son equivalentes, se necesita una
API page personalizada de solo lectura que exponga `itemId`, `itemNumber`,
`availableQuantity` y, opcionalmente, `inventoryQuantity`,
`unitOfMeasureCode` y `lastModifiedAt`. También debe admitir un filtro agrupado
por múltiples `itemId` para evitar solicitudes N+1.

Hasta que esas páginas tengan nombres y campos oficialmente publicados en el
entorno de NEXUS, solo se exportan sus contratos; no se inventan rutas físicas.

## Propiedad de datos

- Dataverse sigue siendo la fuente autorizada de productos y datos comerciales,
  incluidos nombre, descripción y precio.
- Business Central aporta inventario y datos financieros.

Los gateways no escriben, sincronizan, aplican pagos ni consultan líneas de
documentos. Las rutas de entorno, tenant, compañía y credenciales pertenecen a
la configuración y no se documentan aquí.
