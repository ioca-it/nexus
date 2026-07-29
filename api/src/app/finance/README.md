# Finance composition

`FinanceModule` compone la lectura de facturas y notas de crédito sin exponer
clientes, gateways, repositorios, credenciales ni resolvers. Su API pública
consiste únicamente en los cuatro tokens de casos de uso.

Business Central usa un `AzureAccessTokenProvider` singleton interno construido
con las credenciales de `config.businessCentral`. Dataverse reutiliza
`DATAVERSE_ACCESS_TOKEN_PROVIDER` desde `DataverseModule`; ambos sistemas
mantienen credenciales y scopes separados.

Los providers solo construyen objetos y funciones delegadas. La composición no
solicita tokens, no ejecuta `fetch`, no consulta Dataverse ni Business Central y
registra un único controller de lectura.

## AI maintenance map

| Ruta HTTP                       | Token                                         | Caso de uso                      | Mapper                        |
| ------------------------------- | --------------------------------------------- | -------------------------------- | ----------------------------- |
| `GET /finance/invoices`         | `LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE`     | `ListCustomerInvoicesUseCase`    | `toFinanceInvoiceResponse`    |
| `GET /finance/invoices/:id`     | `GET_FINANCE_INVOICE_BY_ID_USE_CASE`          | `GetInvoiceByIdUseCase`          | `toFinanceInvoiceResponse`    |
| `GET /finance/credit-memos`     | `LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE` | `ListCustomerCreditMemosUseCase` | `toFinanceCreditMemoResponse` |
| `GET /finance/credit-memos/:id` | `GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE`      | `GetCreditMemoByIdUseCase`       | `toFinanceCreditMemoResponse` |

Los contratos omiten deliberadamente `businessCentralCustomerId`,
`customerNumber` y datos internos del actor. Para agregar un endpoint, revisar
primero el caso de uso autorizado en `@nexus/modules/finance` y después modificar
`controllers/finance.controller.ts`, `contracts/`, `mappers/` y sus pruebas.
