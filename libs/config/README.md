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
