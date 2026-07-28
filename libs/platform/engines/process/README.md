# Process Engine

Orquesta las evaluaciones puras de permisos, workflow, transiciones y
configuración de notificaciones.

Cuando una transición requiere aprobación, `ProcessRequest.actorContext` debe
contener al menos un `approvalGroupId` que coincida exactamente con uno de los
grupos resueltos por la configuración del workflow. La ausencia del contexto,
de grupos configurados o de una coincidencia deniega el proceso antes de
resolver notificaciones. Las transiciones sin aprobación conservan la
compatibilidad con solicitudes que no incluyen `actorContext`.
