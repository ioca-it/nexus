# Payment Notifications API Contracts

Esta carpeta define exclusivamente el contrato HTTP de Payment Notifications.
Los DTOs de creación y actualización validan datos JSON de entrada mediante
`class-validator`. Los DTOs de acciones representan operaciones sin body.

`PaymentNotificationResponse` describe la respuesta JSON pública. Sus fechas se
serializan como strings ISO 8601 y no expone ninguna entidad de dominio.

Los contratos no contienen lógica de negocio, acceso a repositorios ni
dependencias de infraestructura.
