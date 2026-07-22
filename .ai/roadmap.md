# Roadmap estratégico de NEXUS

## 1. Propósito y alcance

Este documento define la dirección estratégica y la secuencia de evolución de NEXUS. Organiza objetivos, fases, dependencias, riesgos y criterios de avance sin sustituir la planificación detallada de producto ni comprometer fechas no aprobadas.

Debe interpretarse junto con:

- `.ai/AGENTS.md`
- `.ai/architecture.md`
- `.ai/coding-standards.md`
- `.ai/security.md`
- `.ai/workflow.md`
- `.ai/adr/`

## 2. Convención de estados

Para diferenciar aprobación arquitectónica, implementación y planificación, este roadmap usa las siguientes definiciones:

- **Arquitectura vigente:** decisión aprobada mediante ADR y actualmente aplicable.
- **Arquitectura propuesta:** dirección técnica planteada, pero todavía no aprobada mediante ADR.
- **Implementación actual:** capacidad presente y verificable. Salvo indicación contraria, este roadmap toma como referencia el working tree inspeccionado el 2026-07-22; cuando se use el código versionado en `HEAD`, se indicará expresamente.
- **Implementación futura:** capacidad aprobada o prevista que todavía no está implementada.
- **Por definir:** decisión pendiente de análisis o aprobación.

Una decisión arquitectónica se considera formalmente aprobada únicamente cuando está respaldada por un ADR con estado **Aceptado**. Una mención en este roadmap no implica que una propuesta esté aprobada, financiada, calendarizada o implementada. La adopción de Nx Monorepo es **Arquitectura vigente** por ADR-001 y la separación incremental de configuración por dominio es **Arquitectura vigente** por ADR-002. Las demás direcciones técnicas permanecen como **Arquitectura propuesta** o **Por definir** hasta contar con su propio ADR aceptado.

## 3. Visión del proyecto

NEXUS busca consolidarse como una plataforma empresarial segura, modular y mantenible que conecte experiencias web con capacidades corporativas a través de una API central.

La visión arquitectónica comprende:

- Un portal administrativo basado en Next.js App Router.
- Un portal de clientes basado en Next.js App Router.
- Una API NestJS como límite de seguridad, orquestación e integración.
- Microsoft Entra ID como proveedor de identidad.
- Integraciones controladas con Dataverse, Business Central y SharePoint.
- Servicios Azure para despliegue, configuración, secretos y observabilidad.
- Un Nx Monorepo que permita reutilización gobernada y validaciones eficientes.

Las funcionalidades empresariales concretas de los portales y las integraciones deben definirse mediante requisitos aprobados; este roadmap no las presupone.

## 4. Estado actual

### 4.1 Implementación actual

- Nx Monorepo con pnpm y TypeScript.
- `admin-portal` y `customer-portal` basados en Next.js App Router.
- `api` basada en NestJS.
- Proyectos E2E para ambos portales y la API.
- Librería compartida `libs/config`.
- Prefijo global, validación de entradas, CORS, filtro de excepciones, logging y Swagger en la API.
- Endpoints básicos y health checks.
- Validación JWT contra Microsoft Entra ID mediante issuer, audience, RS256 y JWKS.
- Guard de autenticación disponible; la autorización por roles y su aplicación a un endpoint protegido permanecen como **Implementación futura**.
- Infraestructura modular de Auth en `libs/config/src/auth`.
- `JwtStrategy` desacoplada de `getAppConfig()` mediante `getAuthConfig()`.
- Estándar oficial de módulos de configuración en `.ai/config-module-standard.md`.
- ADR-002 aceptado formalmente, con implementación incremental en curso.
- Workflow de CI básico para lint, tests y build.
- Documentos de gobernanza en `.ai/`.

### 4.2 Implementación actual incompleta

Los siguientes elementos existen en el working tree, pero su madurez es parcial:

- Autenticación backend: existe infraestructura inicial. La autorización y la protección global permanecen como **Implementación futura**.
- Pruebas: existen suites iniciales, pero no cubren flujos empresariales.
- Configuración: Auth ya valida únicamente `AZURE_TENANT_ID` y `AZURE_CLIENT_ID`, pero `getAppConfig()` y `NexusConfig` permanecen como compatibilidad temporal legacy.
- Configuración: no existen todavía módulos independientes para Observability, Storage, Key Vault, Dataverse o Business Central, ni una separación completa de puntos de entrada Browser/Server.
- Observabilidad: existe logging básico, pero no instrumentación de Application Insights ni correlación integral.
- Límites Nx: existe la regla base, pero los proyectos no tienen tags arquitectónicos efectivos.

### 4.3 Implementación futura

- Autenticación frontend con MSAL.
- Integración operativa con Azure Key Vault.
- Instrumentación con Application Insights.
- Adaptadores para Dataverse, Business Central y SharePoint.
- Módulos de dominio y aplicación basados en casos de uso reales.
- Capacidades empresariales de ambos portales.
- Endurecimiento de API, CORS, headers y operación productiva.

## 5. Objetivos generales

1. Convertir el scaffolding actual en una plataforma empresarial modular sin perder simplicidad.
2. Aplicar límites claros entre presentación, aplicación, dominio e infraestructura.
3. Completar una identidad end-to-end segura con Microsoft Entra ID.
4. Encapsular integraciones externas detrás de puertos y adaptadores server-side.
5. Mantener contratos tipados y compatibles entre frontends y API.
6. Proteger secretos, permisos y datos sensibles por diseño.
7. Establecer observabilidad y operación verificables.
8. Mejorar cobertura de pruebas alrededor de comportamiento real.
9. Controlar deuda técnica y evitar sobreingeniería.
10. Evolucionar según métricas, riesgos y prioridades de negocio confirmadas.

## 6. Objetivos a corto plazo

Estado: **Implementación futura**, salvo elementos ya identificados como **Implementación actual**.

Completado:

- Infraestructura modular de Auth.
- Migración de `JwtStrategy` a `getAuthConfig()`.
- Estándar oficial para módulos de configuración.

Pendiente:

- Aprobar la gobernanza, arquitectura, estándares, seguridad y workflow documentados.
- Corregir inconsistencias entre código, configuración y pruebas existentes.
- Definir tags Nx y reglas de dependencia entre plataformas y capas.
- Crear cargadores por dominio o módulo únicamente cuando exista un consumidor real aprobado.
- Separar configuración pública de frontend, configuración server-side y secretos, con puntos de entrada públicos distintos para browser y server.
- Habilitar tipado estricto de forma progresiva en la API.
- Endurecer CORS y definir exposición de Swagger por entorno.
- Mejorar logging de errores y correlación básica.
- Alinear pruebas E2E con rutas y puertos reales.
- Definir el modelo de autenticación frontend y autorización backend.
- Definir los primeros casos de uso de negocio antes de crear módulos de dominio o integraciones.

## 7. Objetivos a mediano plazo

Estado: **Implementación futura**.

- Implementar autenticación frontend con MSAL y flujo Authorization Code con PKCE.
- Aplicar protección segura por defecto en la API y políticas de autorización explícitas.
- Implementar configuración server-side con Azure Key Vault mediante identidad aprobada.
- Introducir Application Insights con correlación y redacción de datos sensibles.
- Implementar el primer vertical slice empresarial aprobado de extremo a extremo.
- Crear adaptadores de integración únicamente para los sistemas requeridos por ese caso de uso.
- Establecer contratos compartidos neutrales respecto a frameworks.
- Ampliar pruebas unitarias, de integración y E2E para flujos críticos.
- Formalizar despliegues y promoción entre entornos con controles de seguridad.
- Incorporar métricas de confiabilidad y rendimiento iniciales.

## 8. Objetivos a largo plazo

Estado: **Implementación futura**.

- Ampliar capacidades empresariales de ambos portales según prioridades aprobadas.
- Consolidar módulos de dominio independientes de proveedores externos.
- Completar integraciones necesarias con Dataverse, Business Central y SharePoint.
- Madurar observabilidad, auditoría, alertas y respuesta a incidentes.
- Optimizar rendimiento con evidencia de producción.
- Automatizar controles arquitectónicos, de seguridad y calidad en CI.
- Definir una estrategia formal de releases y versionado.
- Evaluar escalado, colas, caché o separación de servicios solo cuando métricas y dominio lo justifiquen.
- Mantener una plataforma accesible, resiliente y operable.

## 9. Fases del proyecto

### Fase 0. Fundamentos del repositorio

Estado: **Implementación actual** incompleta.

Alcance:

- Workspace Nx, aplicaciones base, API, librería de configuración y pruebas iniciales.
- Gobernanza y documentación arquitectónica.
- Autenticación backend inicial.

Resultado esperado pendiente:

- Baseline coherente, documentado y validable.

### Fase 1. Consolidación arquitectónica

Estado: **Implementación futura**.

Alcance:

- Tags y límites Nx.
- Cargadores y validadores de configuración independientes por dominio o módulo.
- Separación de configuración pública de frontend, configuración server-side y secretos.
- Tipado estricto progresivo.
- Contratos y estructura modular mínima.
- Corrección de inconsistencias técnicas existentes.

### Fase 2. Identidad y seguridad end-to-end

Estado: **Implementación futura**.

Alcance:

- MSAL en los portales.
- Guards y políticas seguras por defecto en la API.
- Roles, scopes y autorización por recurso.
- CORS, headers, rate limiting y manejo seguro de errores.
- Estrategia de secretos con Azure Key Vault.

### Fase 3. Observabilidad y preparación operativa

Estado: **Implementación futura**.

Alcance:

- Application Insights.
- Correlation IDs y logging estructurado.
- Métricas, alertas y health checks apropiados.
- Auditoría según requisitos empresariales.
- Procedimientos de incidentes y reversión.

### Fase 4. Primer vertical slice empresarial

Estado: **Por definir**.

Alcance:

- Seleccionar un caso de uso aprobado.
- Definir dominio, contratos y criterios de aceptación.
- Implementar frontend, API y adaptadores estrictamente necesarios.
- Validar seguridad, integración y experiencia de extremo a extremo.

No se define aquí el caso de uso para evitar inventar funcionalidad de negocio.

### Fase 5. Expansión de integraciones y portales

Estado: **Por definir**.

Alcance:

- Añadir capacidades priorizadas sobre patrones ya validados.
- Incorporar Dataverse, Business Central o SharePoint cuando cada caso de uso lo requiera.
- Extraer reutilización demostrada entre portales y módulos.
- Ampliar cobertura E2E de flujos críticos.

### Fase 6. Optimización y escala

Estado: **Implementación futura**.

Alcance:

- Optimizar según telemetría y objetivos medibles.
- Evaluar estrategias de caché, procesamiento asíncrono y escalado.
- Reducir deuda técnica y costos operativos.
- Revisar arquitectura según crecimiento real.

## 10. Hitos principales

Los hitos son resultados verificables, no fechas comprometidas:

1. Gobernanza técnica aprobada y aplicada.
2. Baseline actual consistente y validaciones Nx confiables.
3. Límites arquitectónicos automatizados.
4. Identidad frontend y backend validada de extremo a extremo.
5. Secretos server-side administrados mediante el mecanismo Azure aprobado.
6. Telemetría correlacionada y segura disponible.
7. Primer caso de uso empresarial implementado y aceptado.
8. Primer adaptador externo validado en un entorno autorizado.
9. Flujos críticos cubiertos mediante pruebas automatizadas.
10. Preparación productiva aprobada por responsables técnicos, seguridad y operación.

Los hitos 4 a 10 son **Implementación futura**; su inclusión no constituye aprobación arquitectónica.

Avance verificado dentro del Hito 2, sin declarar cerrado el hito completo:

- **Decisión aceptada:** separación incremental de configuración por dominio conforme a ADR-002.
- **Completado:** infraestructura modular de Auth.
- **Completado:** migración de `JwtStrategy` a `getAuthConfig()`.
- **Completado:** estándar de módulos de configuración.
- **Pendiente:** configuración modular de Observability, Storage, Key Vault, Dataverse y Business Central.
- **Pendiente:** eliminación de `getAppConfig()` y retiro de `NexusConfig`.

## 11. Prioridades

### P0. Seguridad y corrección

- No exponer secretos ni datos sensibles.
- Mantener autenticación, autorización y validación correctas.
- Corregir regresiones y vulnerabilidades confirmadas.
- Mantener builds, lint y tests confiables.

### P1. Fundamentos arquitectónicos

- Límites Nx y separación de capas.
- Configuración browser/server.
- Contratos tipados.
- Observabilidad mínima.

### P2. Capacidades empresariales aprobadas

- Casos de uso priorizados.
- Integraciones estrictamente necesarias.
- Experiencias de los portales vinculadas a valor verificable.

### P3. Optimización y expansión

- Rendimiento basado en métricas.
- Reutilización demostrada.
- Escalado y automatización avanzada.

Una prioridad inferior no debe bloquear un control P0 necesario.

## 12. Dependencias entre fases

```text
Fase 0: Fundamentos
   |
   v
Fase 1: Consolidacion arquitectonica
   |
   +-------------------+
   |                   |
   v                   v
Fase 2: Identidad   Fase 3: Observabilidad
   |                   |
   +---------+---------+
             |
             v
Fase 4: Primer vertical slice
             |
             v
Fase 5: Expansion controlada
             |
             v
Fase 6: Optimizacion y escala
```

Reglas de dependencia:

- Una fase puede solaparse solo si sus controles previos relevantes están disponibles.
- La deuda de configuración global debe cerrarse antes de depender de nuevas integraciones en los flujos de identidad o negocio.
- No se implementa un flujo protegido antes de definir identidad y autorización.
- No se crea un adaptador externo antes de definir el caso de uso y el propietario de datos.
- No se optimiza sin observabilidad y medición.
- No se escala una estructura que todavía no tiene límites modulares claros.

## 13. Riesgos conocidos

- Los proyectos Nx no tienen tags arquitectónicos efectivos.
- `getAppConfig()` y `NexusConfig` permanecen disponibles como superficie legacy, aunque `JwtStrategy` ya no depende de ellos.
- Un consumidor nuevo de la API global volvería a heredar validaciones de Azure Key Vault, Azure Storage, Dataverse y Business Central.
- El subpath `@nexus/config/auth` establece una frontera para Auth, pero todavía no existe una separación Browser/Server completa ni automatizada.
- La API hereda una configuración TypeScript raíz no estricta.
- CORS está abierto en la configuración actual de la API.
- Swagger no está condicionado por entorno.
- La protección de rutas es opt-in y puede omitirse accidentalmente.
- La prueba E2E de API no está alineada con el prefijo `/api/v1`.
- Ambos portales E2E usan el mismo puerto predeterminado.
- Los frontends mantienen scaffolding duplicado y aún no contienen funcionalidades reales.
- Logging y manejo de errores no incluyen todavía correlación y telemetría integral.
- Las integraciones anunciadas no cuentan con adaptadores implementados.
- La documentación de arquitectura y la estructura real deben mantenerse sincronizadas.

## 14. Riesgos futuros

- Acoplar el dominio a esquemas de Dataverse, Business Central o SharePoint.
- Exponer secretos server-side a bundles de frontend.
- Introducir librerías genéricas que acumulen responsabilidades.
- Duplicar contratos y reglas entre portales y API.
- Expandir permisos de Entra ID por conveniencia.
- Crear integraciones antes de definir ownership, consistencia y errores.
- Añadir caché o procesamiento asíncrono sin estrategia de invalidez e idempotencia.
- Escalar físicamente antes de estabilizar el monolito modular.
- Acumular excepciones de lint, tipos o seguridad como deuda permanente.
- Depender de código generado por IA sin revisión ni pruebas.
- Optimizar métricas locales a costa de mantenibilidad o seguridad.
- No asignar propietarios ni criterios medibles a hitos futuros.

## 15. Arquitectura propuesta

Estado: **Arquitectura propuesta**, con fundamentos parciales de **Implementación actual**.

La arquitectura propuesta plantea:

- Presentación en los portales y Controllers.
- Casos de uso en la capa de aplicación.
- Reglas e invariantes en el dominio.
- Proveedores externos en infraestructura mediante puertos y adaptadores.
- API como límite de seguridad y orquestación.
- Dependencias orientadas hacia el dominio.
- Aplicaciones como composition roots y librerías Nx cohesivas.
- Separación estricta entre browser y server.

La implementación será incremental únicamente después de las aprobaciones mediante ADR que correspondan. No se crearán capas o librerías vacías antes de existir una capacidad real.

## 16. Integraciones previstas

### Microsoft Entra ID

Estado: **Implementación actual** incompleta en backend; **Implementación futura** en frontend.

### Azure Key Vault

Estado: **Implementación futura**. Existe configuración de URL, no un proveedor operativo.

### Application Insights

Estado: **Implementación futura**. Existe configuración opcional, no instrumentación SDK.

### Dataverse

Estado: **Implementación futura**. Existe configuración, no un adaptador funcional.

### Business Central

Estado: **Implementación futura**. Existe configuración, no un adaptador funcional.

### SharePoint

Estado: **Implementación futura**. No existe configuración ni adaptador actual.

Cada integración requiere caso de uso, permisos mínimos, contratos, manejo de errores, pruebas y observabilidad antes de considerarse completa.

## 17. Evolución de seguridad

### Corto plazo

- Definir rutas públicas y privadas de forma segura.
- Restringir CORS y exposición de Swagger.
- Separar configuración browser/server.
- Añadir correlación y redacción consistente de errores.

### Mediano plazo

- Completar autenticación frontend y autorización contextual.
- Integrar Key Vault con identidad aprobada.
- Añadir headers de seguridad, rate limiting y auditoría requerida.
- Automatizar análisis de dependencias y controles de seguridad en CI.

### Largo plazo

- Madurar threat modeling, respuesta a incidentes y revisiones periódicas.
- Revisar privilegios e integraciones según evidencia operativa.
- Incorporar pruebas de abuso para flujos críticos.

Todos estos elementos son **Implementación futura**, salvo controles backend identificados como **Implementación actual**. La separación Browser/Server de configuración es una decisión aceptada por ADR-002 pero continúa pendiente de implementación completa; las demás decisiones asociadas siguen siendo propuestas mientras no tengan un ADR aceptado.

## 18. Evolución de rendimiento

### Implementación actual

No existe una baseline formal de rendimiento ni telemetría productiva en el repositorio.

### Implementación futura

- Definir métricas y objetivos antes de optimizar.
- Reducir JavaScript de cliente mediante Server Components cuando corresponda.
- Evitar consultas y llamadas externas duplicadas.
- Aplicar paginación y selección de campos en integraciones.
- Medir latencia de API y dependencias mediante Application Insights.
- Introducir caché solo con estrategia de consistencia e invalidez.
- Evaluar procesamiento asíncrono únicamente para necesidades demostradas.
- Ejecutar pruebas de carga antes de decisiones de escalado relevantes.

## 19. Evolución de IA

### Implementación actual

- Existen documentos de gobernanza para agentes de IA.
- Los agentes están sujetos al mismo estándar de código, seguridad, validación y revisión que los cambios humanos.

### Implementación futura

- Convertir reglas arquitectónicas y de calidad en controles automatizados cuando sea posible.
- Mantener trazabilidad de cambios asistidos por IA mediante diff, validaciones y revisión humana.
- Crear plantillas de tareas que definan alcance, restricciones y criterios de aceptación.
- Evaluar automatización de documentación y revisión sin conceder acceso a secretos o infraestructura.
- Medir utilidad, defectos y retrabajo de cambios asistidos por IA.

No existe una funcionalidad de IA para usuarios finales planificada o implementada en el repositorio. Cualquier incorporación requerirá requisitos, threat model, privacidad, evaluación de datos y ADR específicos.

## 20. Evolución del portal de clientes

### Implementación actual

- Aplicación Next.js App Router con página y endpoint de ejemplo.
- Pruebas iniciales de renderizado y E2E.
- Sin autenticación frontend ni funcionalidad empresarial implementada.

### Implementación futura

- Definir usuarios, journeys y criterios de accesibilidad.
- Implementar autenticación con Entra ID después de aprobar el diseño.
- Consumir contratos de API tipados sin acceso directo a integraciones.
- Incorporar vertical slices según prioridades de negocio confirmadas.
- Crear componentes compartidos solo cuando exista reutilización real.
- Añadir pruebas de accesibilidad, integración y flujos críticos.

No se definen aquí funcionalidades específicas del cliente porque todavía no existen requisitos aprobados en el repositorio.

## 21. Evolución del portal administrativo

### Implementación actual

- Aplicación Next.js App Router con página y endpoint de ejemplo.
- Pruebas iniciales de renderizado y E2E.
- Sin autenticación frontend ni funcionalidad administrativa implementada.

### Implementación futura

- Definir usuarios administrativos, roles y operaciones autorizadas.
- Implementar autenticación con Entra ID y autorización validada nuevamente por la API.
- Diseñar operaciones sensibles con auditoría y confirmación apropiadas.
- Incorporar vertical slices aprobados sin acceso directo a proveedores externos.
- Añadir pruebas de roles, accesibilidad y flujos críticos.

No se definen operaciones administrativas concretas sin requisitos de negocio aprobados.

## 22. Evolución del backend

### Implementación actual

- API NestJS con infraestructura transversal inicial.
- Autenticación JWT implementada; autorización por roles pendiente.
- Sin módulos funcionales de dominio o integraciones empresariales.

### Implementación futura

- Organizar capacidades por módulos cohesivos y casos de uso.
- Introducir protección privada por defecto y rutas públicas explícitas.
- Separar aplicación, dominio e infraestructura gradualmente.
- Crear adaptadores externos detrás de puertos.
- Mantener contratos versionables y errores seguros.
- Añadir observabilidad, rate limiting y pruebas de integración.
- Preparar escalado stateless antes de introducir distribución adicional.

## 23. Evolución de infraestructura

### Implementación actual

La documentación base menciona Azure App Service, Azure Key Vault y Azure Storage. El repositorio no contiene una definición de infraestructura como código ni evidencia suficiente para considerar esas capacidades operativas.

### Implementación futura

- Definir topología y ownership por entorno.
- Formalizar despliegue en Azure mediante un mecanismo aprobado.
- Usar identidad administrada y Key Vault para accesos server-side.
- Configurar Application Insights, alertas y dashboards.
- Separar desarrollo, QA y producción.
- Definir red, TLS, backups, recuperación y continuidad.
- Automatizar promociones con aprobaciones y evidencia.
- Documentar reversión y respuesta a incidentes.

Ningún elemento de infraestructura debe modificarse o desplegarse sin autorización explícita.

## 24. Criterios para cerrar una fase

Una fase puede cerrarse cuando:

1. Su alcance y criterios de aceptación están satisfechos.
2. Los hitos asociados tienen evidencia verificable.
3. Builds, lint, tests y validaciones requeridas pasan.
4. No existen riesgos críticos o altos sin tratamiento aprobado.
5. La seguridad y compatibilidad fueron revisadas.
6. La documentación y ADR están actualizados.
7. La deuda diferida está registrada con propietario y prioridad.
8. Los responsables técnicos y de negocio aplicables aceptan el resultado.
9. Existe una estrategia de operación y reversión cuando corresponda.
10. La implementación real coincide con el estado documentado.

Una fase no se cierra únicamente por fecha o consumo de presupuesto.

## 25. Criterios para iniciar una nueva fase

Una fase puede iniciarse cuando:

1. El objetivo y valor esperado están definidos.
2. Las dependencias previas relevantes están completas o tienen mitigación aprobada.
3. Existen criterios de aceptación y alcance explícitos.
4. Se conocen propietarios y responsables de decisión.
5. Los riesgos iniciales fueron evaluados.
6. Las decisiones de arquitectura necesarias están registradas.
7. Los entornos, accesos y datos de prueba requeridos están disponibles de forma segura.
8. Existe capacidad para validar y operar el resultado.

No se debe iniciar una fase para ocupar capacidad si sus requisitos esenciales están por definir.

## 26. Gestión de deuda técnica

- Registrar deuda con contexto, impacto, riesgo, propietario y criterio de resolución.
- Diferenciar deuda intencional de defectos o vulnerabilidades.
- No ocultar deuda mediante excepciones de lint, tipos o tests.
- Priorizar deuda que afecte seguridad, confiabilidad, velocidad de entrega o costo operativo.
- Reservar capacidad de remediación dentro de la planificación.
- Revisar deuda al inicio y cierre de cada fase.
- Eliminar elementos obsoletos y evitar registros sin acción posible.
- No usar el roadmap como sustituto de una corrección crítica inmediata.

Deuda inicial visible:

- Falta de límites Nx efectivos.
- Tipado no estricto en la configuración base/API.
- Configuración global legacy pendiente de retiro y separación Browser/Server incompleta.
- Pruebas de scaffolding desalineadas con el comportamiento actual.
- Duplicación inicial entre portales.
- Documentación raíz todavía genérica.

### 26.1 Deuda prioritaria: configuración global y autenticación

Estado de la decisión: **Aceptada mediante ADR-002**.

Estado de implementación: **Parcial** y con **deuda técnica conocida** hasta retirar la configuración global legacy.

Prioridad: **P1 — Fundamentos arquitectónicos**. Debe resolverse antes de incorporar nuevas dependencias funcionales de Dataverse, Business Central, Azure Storage o Azure Key Vault a los flujos de identidad o negocio. No se asignan fechas ni responsables en este documento.

Primer corte completado:

- Se implementó la infraestructura modular de Auth.
- `JwtStrategy` usa `getAuthConfig()` y ya no depende de `getAppConfig()`.
- Auth inicia sin variables de Dataverse, Business Central, Azure Storage o Azure Key Vault.
- Se documentó el estándar oficial de módulos de configuración.

Pendiente:

- Crear configuración modular de Observability cuando exista un consumidor real aprobado.
- Crear configuración modular de Storage cuando exista un consumidor real aprobado.
- Crear configuración modular de Key Vault cuando exista un consumidor real aprobado.
- Crear configuración modular de Dataverse cuando exista un consumidor real aprobado.
- Crear configuración modular de Business Central cuando exista un consumidor real aprobado.
- Completar la separación Browser/Server.
- Eliminar `getAppConfig()` cuando no existan consumidores legacy.
- Eliminar `NexusConfig` de forma compatible.
- Retirar los exports legacy.

### 26.2 Arquitectura aceptada para resolver la deuda

- Crear cargadores y validadores independientes por dominio o módulo; Auth ya aplica este patrón.
- Separar configuración pública de frontend, configuración server-side y secretos.
- Validar cada variable únicamente desde el módulo que la utiliza.
- Mantener el contrato mínimo de Auth ya entregado a `JwtStrategy`.
- Evitar dependencias de autenticación sobre Dataverse, Business Central, Azure Storage o Azure Key Vault salvo necesidad real.
- Publicar puntos de entrada independientes para browser y server.
- Garantizar que el punto de entrada browser no pueda exportar secretos ni loaders server-side.

Esta arquitectura es vigente por la aceptación formal de ADR-002. Su implementación es incremental y los elementos pendientes no deben presentarse como capacidades actuales.

### 26.3 Dependencias de la corrección

- Repetir el inventario de consumidores de `@nexus/config` antes de retirar la API legacy.
- Definir contratos mínimos por módulo sin cambiar funcionalidades no relacionadas.
- Definir los puntos de entrada browser y server y sus límites de importación.
- Mantener una transición compatible para consumidores existentes.
- Coordinar la futura integración con Key Vault sin hacerla requisito para desacoplar autenticación.
- Actualizar documentación y, si la decisión cambia límites públicos, registrar el ADR correspondiente.

### 26.4 Criterios de cierre

La deuda puede cerrarse cuando:

1. **Cumplido:** `JwtStrategy` valida únicamente la configuración necesaria para autenticación.
2. **Cumplido:** la ausencia de variables de Dataverse, Business Central, Azure Storage o Azure Key Vault no bloquea Auth.
3. **Cumplido para Auth; pendiente para módulos futuros:** cada módulo valida exclusivamente sus propias variables.
4. **Pendiente:** existen puntos de entrada públicos separados para browser y server.
5. **Pendiente:** el punto de entrada browser no exporta secretos, loaders server-side ni acceso genérico a `process.env`.
6. **Parcial:** los consumidores actuales mantienen el comportamiento esperado; debe repetirse el inventario antes del retiro legacy.
7. **Cumplido para el primer corte:** la documentación refleja la implementación parcial.
8. **Pendiente:** eliminar `getAppConfig()`.
9. **Pendiente:** retirar `NexusConfig`.

### 26.5 Validaciones esperadas

- Tests unitarios para cada loader y validador independiente.
- Tests de `JwtStrategy` con solo la configuración requerida para autenticación.
- Tests negativos que demuestren que cada módulo falla únicamente por sus propias variables ausentes o inválidas.
- Comprobación de imports para impedir dependencias browser hacia configuración server-side.
- Build, lint y tests de `api`, `admin-portal`, `customer-portal` y `config` según el impacto real del cambio.
- Validación Nx específica o `affected` para consumidores relacionados.
- Revisión del diff para confirmar que no se incorporan secretos ni cambios funcionales ajenos.

Baseline verificado el 2026-07-22:

- `config`: lint satisfactorio, 4 tests satisfactorios y build satisfactorio.
- `api`: lint satisfactorio, 9 tests satisfactorios en 3 suites y build satisfactorio.
- Nx reutilizó caché válida en algunos targets y ejecutó la suite completa de API sin caché.

Las comprobaciones de límites Browser/Server y las validaciones de módulos futuros permanecen pendientes hasta que existan esas implementaciones.

## 27. Consideraciones para futuras versiones

- Formalizar versionado semántico cuando existan releases o paquetes con consumidores definidos.
- Mantener compatibilidad de contratos y documentar migraciones.
- No asociar una versión a funcionalidades sin criterios de aceptación aprobados.
- Evaluar cambios incompatibles mediante ADR y plan de transición.
- Mantener notas de release verificables y libres de información sensible.
- Separar versiones de aplicaciones si sus ciclos de entrega divergen y existe una necesidad real.
- Considerar feature flags solo con ownership, expiración y estrategia de limpieza.
- Evaluar localización, accesibilidad, privacidad y retención según requisitos futuros.
- Revisar soporte de runtimes y dependencias antes de cada ciclo mayor.
- Basar decisiones de escala y optimización en telemetría real.

No existe actualmente una estrategia de releases formal implementada.

## 28. Gobierno y actualización del roadmap

- Revisar el roadmap al cerrar una fase o cambiar una prioridad material.
- Actualizar estados únicamente con evidencia verificable.
- No convertir planificación en compromiso de fecha sin aprobación de los responsables.
- Registrar decisiones duraderas en `.ai/adr/`.
- Mantener riesgos, dependencias y deuda sincronizados con la realidad.
- Eliminar o reformular objetivos que hayan perdido valor.
- No modificar el roadmap para presentar como completo trabajo que aún no cumple sus criterios.
