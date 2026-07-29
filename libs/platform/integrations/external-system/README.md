# External Systems Integration Layer

Contratos transversales para describir operaciones con sistemas externos sin
acoplar Application a un proveedor, protocolo, transporte o mecanismo de
autenticación.

## Responsabilidades

- `ExternalOperationContext` identifica el sistema, la operación y el contexto
  de correlación opcional.
- `ExternalRequest` transporta un payload tipado junto con su contexto.
- `ExternalResponse` transporta un resultado tipado y conserva el contexto de
  la operación.
- `ExternalSystemClient` define la ejecución asíncrona de una solicitud.
- `ExternalSystemProvider` asocia una identidad de sistema estable con su
  cliente.
- `ExternalSystemError` representa un fallo externo mediante código, contexto y
  causa opcional.

La capa contiene únicamente contratos readonly y el error base. Las
implementaciones concretas, composición, autenticación, transporte, políticas
de resiliencia y observabilidad pertenecen a capas externas.
