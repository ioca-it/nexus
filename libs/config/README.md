# Config

Configuración modular de NEXUS. Los consumidores deben acceder mediante
`@nexus/config`; la lectura de variables de entorno permanece encapsulada en
esta librería.

## Dataverse Payment Notifications

Los nombres físicos deben suministrarse para cada entorno. Todas estas
variables son obligatorias y no tienen valores predeterminados:

```dotenv
DATAVERSE_PAYMENT_NOTIFICATION_ENTITY_SET=
DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_ENTITY_SET=

DATAVERSE_PAYMENT_NOTIFICATION_FIELD_ID=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CUSTOMER_ID=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_STATUS=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_PAYMENT_DATE=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_AMOUNT=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CURRENCY=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_BANK_REFERENCE=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_RECEIPT_FILE_ID=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_CREATED_AT=
DATAVERSE_PAYMENT_NOTIFICATION_FIELD_UPDATED_AT=

DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_ID=
DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_PAYMENT_NOTIFICATION_ID=
DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_INVOICE_ID=
DATAVERSE_PAYMENT_NOTIFICATION_INVOICE_FIELD_CREATED_AT=
```

## Dataverse Authenticated Actor

Los nombres físicos para usuarios autorizados de NEXUS deben suministrarse para
cada entorno. Todas estas variables son obligatorias y no tienen valores
predeterminados:

```dotenv
DATAVERSE_NEXUS_USER_ENTITY_SET=
DATAVERSE_NEXUS_USER_ROLE_ENTITY_SET=
DATAVERSE_NEXUS_USER_PERMISSION_ENTITY_SET=
DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_ENTITY_SET=

DATAVERSE_NEXUS_USER_FIELD_OID=
DATAVERSE_NEXUS_USER_FIELD_ACTIVE=
DATAVERSE_NEXUS_USER_FIELD_CUSTOMER_ID=

DATAVERSE_NEXUS_USER_ROLE_FIELD_OID=
DATAVERSE_NEXUS_USER_ROLE_FIELD_ROLE=

DATAVERSE_NEXUS_USER_PERMISSION_FIELD_OID=
DATAVERSE_NEXUS_USER_PERMISSION_FIELD_MODULE=
DATAVERSE_NEXUS_USER_PERMISSION_FIELD_ACTION=
DATAVERSE_NEXUS_USER_PERMISSION_FIELD_EFFECT=

DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_FIELD_OID=
DATAVERSE_NEXUS_APPROVAL_GROUP_MEMBER_FIELD_APPROVAL_GROUP_ID=
```

## Dataverse Finance Customer Reference

Este schema configura los nombres físicos necesarios para resolver la relación
entre la empresa identificada por `NexusCustomerId` en NEXUS/Dataverse y su
referencia `BusinessCentralCustomerId`. La relación pertenece a Dataverse y es
independiente del schema de Authenticated Actor.

Todas las variables son obligatorias, no tienen valores predeterminados y deben
suministrarse por entorno:

```dotenv
DATAVERSE_FINANCE_CUSTOMER_ENTITY_SET=
DATAVERSE_FINANCE_CUSTOMER_FIELD_NEXUS_CUSTOMER_ID=
DATAVERSE_FINANCE_CUSTOMER_FIELD_BUSINESS_CENTRAL_CUSTOMER_ID=
DATAVERSE_FINANCE_CUSTOMER_FIELD_ACTIVE=
```

La configuración no asume igualdad entre ambos identificadores ni permite
inferir la relación desde nombres, correos, datos fiscales o comerciales. Los
nombres físicos reales y cualquier valor productivo deben permanecer en la
configuración segura del entorno. No deben almacenarse secretos ni valores
productivos en archivos versionados.

## Commercial Catalog Dataverse schema

Dataverse es la fuente autorizada de productos y precios asignados por cliente.
El schema configura exclusivamente sus nombres físicos; el inventario pertenece
a Business Central y queda fuera de esta configuración. Todas las variables son
obligatorias, no tienen valores predeterminados y deben suministrarse por
entorno:

```dotenv
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_ENTITY_SET=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ID=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_NUMBER=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_NAME=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_DESCRIPTION=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_CATEGORY_ID=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_IMAGE_REFERENCE=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_UNIT_OF_MEASURE_CODE=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ECOMMERCE_URL=
DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ACTIVE=

DATAVERSE_COMMERCIAL_CATALOG_PRICE_ENTITY_SET=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_ID=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_CUSTOMER_ID=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_PRODUCT_ID=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_CURRENCY_CODE=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_UNIT_PRICE=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_MINIMUM_QUANTITY=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_VALID_FROM=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_VALID_TO=
DATAVERSE_COMMERCIAL_CATALOG_PRICE_FIELD_ACTIVE=
```

Los nombres reales de entity sets y columnas permanecen pendientes para cada
entorno. Para agregar un campo físico, deben actualizarse conjuntamente
`dataverse-config.types.ts`, `dataverse-config.validator.ts`,
`dataverse-config.loader.ts` y las pruebas específicas del schema. No deben
incorporarse nombres productivos ni secretos al repositorio.

### AI maintenance map

| Concern                        | Authoritative files                               |
| ------------------------------ | ------------------------------------------------- |
| Physical product field names   | `src/dataverse/dataverse-config.types.ts`         |
| Required environment names     | `src/dataverse/dataverse-config.validator.ts`     |
| Frozen schema construction     | `src/dataverse/dataverse-config.loader.ts`        |
| Commercial Catalog schema test | `src/dataverse/commercial-catalog-config.spec.ts` |

`DATAVERSE_COMMERCIAL_CATALOG_PRODUCT_FIELD_ECOMMERCE_URL` configura
exclusivamente el nombre de la columna física de Dataverse. Es obligatorio, no
tiene valor predeterminado y los archivos versionados no deben fijar un nombre
productivo. El valor de la columna puede faltar en un producto. La validación
HTTPS pertenece al dominio Commercial Catalog y a su validador Dataverse, no a
Config.

## Payment Notifications approval groups

Cada acción con aprobación requiere su propia lista de identificadores de
grupos, separada por comas. No existen grupos predeterminados ni compartidos
implícitamente entre acciones:

```dotenv
PAYMENT_NOTIFICATIONS_VALIDATE_APPROVAL_GROUP_IDS=GROUP-A,GROUP-B
PAYMENT_NOTIFICATIONS_REJECT_APPROVAL_GROUP_IDS=GROUP-C
PAYMENT_NOTIFICATIONS_REQUEST_CHANGES_APPROVAL_GROUP_IDS=GROUP-D,GROUP-E
```

Los identificadores anteriores son ejemplos exclusivos de configuración. Los
valores reales deben suministrarse para cada entorno.

## Business Central

Business Central utiliza una identidad y un tenant independientes de la
identidad principal de NEXUS. Los siete valores son obligatorios, no tienen
valores predeterminados y deben suministrarse mediante configuración segura por
entorno:

```dotenv
BUSINESS_CENTRAL_TENANT_ID=
BUSINESS_CENTRAL_CLIENT_ID=
BUSINESS_CENTRAL_CLIENT_SECRET=
BUSINESS_CENTRAL_RESOURCE_URL=
BUSINESS_CENTRAL_ENVIRONMENT_NAME=
BUSINESS_CENTRAL_COMPANY_ID=
BUSINESS_CENTRAL_API_VERSION=
```

- `BUSINESS_CENTRAL_TENANT_ID`: tenant donde reside Business Central.
- `BUSINESS_CENTRAL_CLIENT_ID`: identidad de aplicación para autenticación
  saliente.
- `BUSINESS_CENTRAL_CLIENT_SECRET`: credencial de la identidad de aplicación.
- `BUSINESS_CENTRAL_RESOURCE_URL`: recurso utilizado para construir el scope de
  autenticación.
- `BUSINESS_CENTRAL_ENVIRONMENT_NAME`: ambiente de Business Central.
- `BUSINESS_CENTRAL_COMPANY_ID`: compañía objetivo, expresada mediante su
  identificador configurado.
- `BUSINESS_CENTRAL_API_VERSION`: versión requerida por la futura integración.

El secreto `bc-tenant-id` debe resolverse mediante el mecanismo seguro de
configuración de cada entorno. No se consulta Key Vault desde esta librería.
Los secretos no deben almacenarse en archivos versionados ni compartirse con
`config.azure` o la identidad JWT entrante. No se documentan aquí valores
productivos.

## Building

Run `nx build config` to build the library.

## Running unit tests

Run `nx test config` to execute the unit tests via [Jest](https://jestjs.io).

## Orders approval groups

Orders uses independent environment lists for approval actions. Values are
comma-separated, trimmed and deduplicated by the Orders loader:

```dotenv
ORDERS_REQUEST_CHANGES_APPROVAL_GROUP_IDS=
ORDERS_REJECT_APPROVAL_GROUP_IDS=
ORDERS_APPROVE_APPROVAL_GROUP_IDS=
```

The validator and loader under `src/orders/` are the authoritative boundaries.
No IDs or defaults are committed; Config supplies groups while the Orders
module owns the workflow definition.

## Orders Dataverse Schema

Orders configuration defines configurable entity sets and fields for Orders and OrderLines. Dataverse is the authorized source; Commercial Catalog remains the source for products/prices and Business Central remains reserved for future inventory. To add a field, update orders-config.types.ts, loader, validator environment list, tests, and the Orders infrastructure schema adapter. Physical names remain environment-owned and are never documented here.
