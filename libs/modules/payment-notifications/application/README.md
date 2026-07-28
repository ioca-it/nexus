# Payment Notifications Application

Define la configuración inmutable del ciclo de vida aprobado para Payment
Notifications mediante el Motor de Workflow de Platform.

Las seis operaciones transicionales reciben un `AuthenticatedActor` y crean su
`ProcessRequest` mediante una única fábrica. Los permisos evaluados son
exactamente `actor.permissions`; `actor.userId` y `actor.approvalGroupIds`
forman el contexto de aprobación. Los roles no otorgan permisos ni grupos.

`validate`, `reject` y `request_changes` reciben grupos aprobadores propios de
cada acción. `submit`, `start_review` y `resubmit` no configuran grupos. Una
decisión denegada o inválida devuelve la entidad original sin consultar el
reloj ni persistir.

`create_draft` y `update` usan la política de acceso del módulo sin ejecutar
workflow. Create Draft obtiene `customerId` exclusivamente del actor. Update,
Submit y Resubmit impiden operaciones entre clientes distintos; un actor sin
contexto de cliente solo continúa con el permiso explícito correspondiente.

Las consultas reutilizan la misma política con la acción `read`. La consulta
por ID se compone con alcance de cliente o administrativo; el listado del
cliente deriva siempre su `customerId` del actor y el listado administrativo
recibe explícitamente el cliente solicitado.
