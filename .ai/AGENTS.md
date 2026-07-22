# Gobernanza de agentes de IA — NEXUS

## 1. Alcance y autoridad

Este archivo es el documento maestro de gobernanza para cualquier agente de IA que trabaje en el repositorio NEXUS. Sus reglas aplican a todo el monorepo y deben interpretarse junto con las instrucciones explícitas de la tarea en curso.

Ante una contradicción, el agente debe detenerse, describirla y solicitar autorización antes de realizar una acción irreversible, sensible o fuera de alcance. La ausencia de una prohibición explícita no constituye autorización para ampliar el alcance.

## 2. Identidad y propósito

NEXUS es un proyecto empresarial implementado como un Nx Monorepo. Su plataforma incluye:

- Backend basado en NestJS.
- Frontends basados en Next.js con App Router.
- Autenticación y autorización con Microsoft Entra ID.
- Servicios e infraestructura de Azure.
- Integraciones empresariales con Dataverse, Business Central y SharePoint.

El propósito de los agentes es colaborar en la evolución segura y sostenible de NEXUS, preservando sus límites arquitectónicos, la trazabilidad de los cambios y la estabilidad de los proyectos relacionados.

## Arquitectura y Filosofía NEXUS

Todo trabajo en NEXUS debe seguir esta filosofía:

- Analizar antes de diseñar.
- Diseñar antes de implementar.
- Implementar el cambio mínimo necesario.
- Validar antes de finalizar.
- Documentar las decisiones importantes.
- Mantener siempre una arquitectura limpia.
- Favorecer soluciones simples sobre soluciones complejas.
- Evitar sobreingeniería.

## Arquitectura por capas

La arquitectura de NEXUS debe mantener una separación clara entre las siguientes capas:

- Aplicación.
- Dominio.
- Infraestructura.
- Presentación.

Además, todo agente debe:

- No colocar lógica de negocio en Controllers.
- No colocar lógica de negocio en React Components.
- Mantener una separación estricta de responsabilidades.
- Respetar los principios SOLID cuando sean aplicables.

## 3. Principios obligatorios

Todo agente debe:

1. Realizar cambios pequeños, modulares, verificables y reversibles.
2. Evitar duplicar código, contratos, configuración o lógica de negocio.
3. Mantener tipado estricto y contratos explícitos entre capas.
4. Priorizar, en este orden contextual, seguridad, corrección, mantenibilidad y rendimiento.
5. Respetar la arquitectura, las convenciones y los patrones existentes antes de proponer otros nuevos.
6. Introducir una dependencia solo cuando exista una necesidad demostrable que no pueda resolverse razonablemente con las capacidades actuales.
7. Mantener cada cambio dentro del alcance solicitado.
8. Preservar compatibilidad con los consumidores existentes, salvo autorización explícita para introducir un cambio incompatible.

## Rendimiento

Siempre se debe priorizar:

- Simplicidad.
- Mantenibilidad.
- Rendimiento.
- Reutilización.

Se debe evitar:

- Consultas duplicadas.
- Renders innecesarios.
- Dependencias pesadas.
- Código muerto.
- Optimización prematura.

## Convención de cambios

Todo cambio debe cumplir estas convenciones:

- Modificar el menor número posible de archivos.
- No refactorizar fuera del alcance solicitado.
- No cambiar el estilo únicamente por preferencia.
- Mantener compatibilidad hacia atrás cuando sea posible.

## 4. Flujo de trabajo obligatorio

Para cada tarea que implique cambios, el agente debe seguir esta secuencia:

1. **Analizar antes de modificar.** Leer las instrucciones aplicables, inspeccionar la estructura y comprender el comportamiento actual.
2. **Identificar el impacto.** Enumerar los archivos que será necesario modificar y los proyectos o librerías que pueden resultar afectados.
3. **Definir el mínimo cambio.** Elegir la solución más pequeña que cumpla el objetivo sin introducir trabajo especulativo.
4. **Implementar de forma acotada.** Modificar únicamente los archivos necesarios y preservar cambios previos no relacionados.
5. **Ejecutar validaciones.** Aplicar las validaciones mínimas definidas en este documento cuando la tarea las autorice.
6. **Revisar el diff.** Confirmar que no existen cambios accidentales, secretos, archivos generados o modificaciones fuera de alcance.
7. **Reportar resultados.** Entregar un resumen preciso con archivos, validaciones, riesgos y pendientes.

El agente no debe hacer commit ni push sin autorización explícita. Las restricciones absolutas de la sección 10 prevalecen sobre cualquier inferencia de autorización.

## 5. Validaciones mínimas

Antes de declarar terminada una implementación, el agente debe ejecutar, según corresponda:

- Build del proyecto afectado.
- Lint del proyecto afectado cuando exista un target o configuración aplicable.
- Tests existentes relacionados con el cambio.
- Tests nuevos cuando el cambio introduzca comportamiento que deba quedar protegido.
- Validaciones de proyectos dependientes o relacionados para confirmar que no se han producido regresiones.

En Nx, se deben preferir targets específicos o validaciones `affected` frente a ejecutar innecesariamente todo el monorepo.

Si la tarea prohíbe una validación, el entorno no permite ejecutarla o no existe el target correspondiente, el agente no debe sustituirla por una afirmación no verificada: debe reportarla como no ejecutada e indicar el motivo.

## 6. Seguridad

Todo agente debe cumplir las siguientes reglas:

- No crear, revelar, copiar, registrar ni modificar secretos.
- No acceder ni realizar cambios en Azure, Key Vault, tenants, credenciales, suscripciones o infraestructura sin autorización explícita y específica.
- No exponer secretos, tokens, credenciales ni configuración confidencial al frontend, a logs, a respuestas HTTP o a artefactos versionados.
- No modificar variables de entorno reales ni archivos que contengan valores reales.
- No incluir secretos en código, tests, fixtures, documentación, comandos o ejemplos.
- No eliminar archivos, recursos, datos o configuraciones sin autorización explícita.
- No reducir controles de autenticación, autorización, validación, auditoría o cifrado para facilitar una implementación.
- Tratar toda entrada externa como no confiable y validar datos en los límites del sistema.

Para reglas ampliadas, consultar `.ai/security.md`.

## 7. Reglas por tecnología

### Next.js App Router

- Separar correctamente Server Components y Client Components.
- Usar `"use client"` solo cuando sean necesarias APIs del navegador, estado o interacción del cliente.
- Mantener operaciones privilegiadas, secretos y acceso directo a servicios internos exclusivamente en el servidor.
- Evitar duplicar lógica de obtención, transformación o validación de datos entre rutas y componentes.

### NestJS

- Organizar capacidades mediante módulos cohesivos y con responsabilidades claras.
- Mantener controladores delgados y delegar lógica en servicios o casos de uso.
- Implementar autenticación y autorización mediante guards.
- Usar interceptors y filtros para preocupaciones transversales, sin acoplarlos al dominio.
- Evitar dependencias circulares y acceso directo entre módulos que eluda contratos públicos.

### Nx

- Respetar los límites entre aplicaciones y librerías.
- No importar implementaciones internas de otro proyecto mediante rutas relativas.
- Consumir librerías mediante sus puntos de entrada públicos.
- Mantener el grafo de dependencias orientado desde aplicaciones hacia librerías, nunca entre aplicaciones.
- Aplicar tags y restricciones de dependencias cuando se creen o consoliden límites arquitectónicos.

### TypeScript

- Mantener activado el tipado estricto donde ya exista y avanzar hacia él donde aún no esté habilitado.
- Evitar `any`; su uso requiere una justificación explícita y localizada.
- Preferir `unknown` con validación o narrowing cuando el tipo de entrada sea incierto.
- No silenciar errores de tipos con casts inseguros, `@ts-ignore` o configuraciones más permisivas sin autorización y justificación.

### Configuración

- Centralizar configuración compartida mediante `libs/config`.
- Mantener separación explícita entre configuración de browser y configuración de server.
- No exportar secretos ni cargadores de entorno del servidor a módulos consumibles por el navegador.
- Cada módulo debe validar únicamente la configuración que realmente necesita.

## 8. Documentación

- Documentar decisiones arquitectónicas, de seguridad o de compatibilidad que tengan impacto duradero.
- Registrar decisiones relevantes como ADR dentro de `.ai/adr/`.
- Mantener comentarios de código solo cuando expliquen contexto, restricciones o decisiones que el código por sí solo no comunica.
- Actualizar documentación afectada dentro del mismo cambio cuando corresponda.

Documentos de referencia obligatoria según el alcance de la tarea:

- `.ai/architecture.md`
- `.ai/coding-standards.md`
- `.ai/security.md`
- `.ai/workflow.md`
- `.ai/roadmap.md`
- `.ai/adr/`

## 9. Forma de respuesta del agente

La respuesta final de una tarea debe ser breve, verificable y limitarse a información relevante. Cuando aplique, debe incluir:

1. Resumen de cambios realizados.
2. Archivos modificados.
3. Validaciones ejecutadas y su resultado.
4. Validaciones no ejecutadas y su motivo.
5. Riesgos, limitaciones o pendientes conocidos.

El formato fijo de la respuesta debe ser:

### Resumen

### Archivos modificados

### Validaciones

### Pendientes

### Próximo paso sugerido

El agente no debe incluir detalles irrelevantes, afirmar que una validación pasó sin haberla ejecutado ni ocultar fallos o incertidumbres.

## 10. Restricciones absolutas

Sin una instrucción explícita, específica y vigente que cambie estas restricciones, ningún agente puede:

- Hacer commit.
- Hacer push.
- Desplegar aplicaciones o servicios.
- Cambiar infraestructura.
- Crear, leer, revelar, rotar o modificar secretos.
- Ampliar el alcance de la tarea.

Cuando completar una tarea requiera cualquiera de estas acciones, el agente debe detenerse, explicar la necesidad y solicitar autorización antes de proceder.
