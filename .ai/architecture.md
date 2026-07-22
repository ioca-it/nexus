# Arquitectura oficial de NEXUS

## 1. Propósito y alcance

Este documento define la arquitectura oficial del proyecto empresarial NEXUS. Establece la implementación actual verificable, la arquitectura vigente, la arquitectura propuesta y las reglas que deben guiar su evolución.

### Autoridad de los ADR

Una decisión arquitectónica se considera formalmente aprobada únicamente cuando está respaldada por un ADR con estado **Aceptado**. Una propuesta incluida en este documento no adquiere aprobación automática por aparecer aquí. ADR-001 aprueba exclusivamente la adopción de Nx Monorepo y su estructura principal. ADR-002 aprueba la separación incremental de configuración por dominio, el desacoplamiento de la API global y las fronteras Browser/Server definidas en su alcance.

Este documento usa las siguientes definiciones:

- **Arquitectura vigente:** decisión aprobada mediante ADR y actualmente aplicable.
- **Arquitectura propuesta:** dirección técnica planteada, pero todavía no aprobada mediante ADR.
- **Implementación actual:** capacidad presente y verificable. Salvo indicación contraria, este documento toma como referencia el working tree inspeccionado el 2026-07-22; cuando se use el código versionado en `HEAD`, se indicará expresamente.
- **Implementación futura:** capacidad aprobada o prevista que todavía no está implementada.
- **Por definir:** decisión pendiente de análisis o aprobación.

Este documento no atribuye a NEXUS funcionalidades de negocio que todavía no estén representadas en el repositorio.

## 2. Visión general de la arquitectura

NEXUS es un Nx Monorepo TypeScript compuesto actualmente por:

- `admin-portal`: frontend administrativo basado en Next.js App Router.
- `customer-portal`: frontend de clientes basado en Next.js App Router.
- `api`: backend basado en NestJS.
- `admin-portal-e2e`: pruebas E2E del portal administrativo con Playwright.
- `customer-portal-e2e`: pruebas E2E del portal de clientes con Playwright.
- `api-e2e`: pruebas E2E de la API con Jest y Axios.
- `libs/config`: librería compartida para carga, validación y tipado de configuración.

El backend ya contiene infraestructura inicial para validación HTTP, manejo global de excepciones, logging, health checks y validación de tokens emitidos por Microsoft Entra ID.

Las integraciones funcionales con Dataverse, Business Central, SharePoint, Azure Key Vault y Application Insights todavía no están implementadas. El repositorio contiene configuración o intención arquitectónica para algunas de ellas, pero no adaptadores operativos.

## 3. Objetivos arquitectónicos

Estos objetivos orientan el diseño, pero no aprueban por sí mismos una decisión arquitectónica.

La arquitectura de NEXUS debe:

1. Mantener separadas la presentación, la aplicación, el dominio y la infraestructura.
2. Aislar la lógica de negocio de frameworks, transporte y proveedores externos.
3. Permitir que cada portal evolucione sin duplicar capacidades compartibles.
4. Centralizar el acceso a sistemas empresariales a través de la API.
5. Proteger secretos y datos sensibles en todos los límites del sistema.
6. Mantener contratos tipados, explícitos y compatibles entre proyectos.
7. Facilitar pruebas unitarias, de integración y E2E por responsabilidad.
8. Escalar mediante módulos cohesivos antes de introducir distribución física.
9. Usar las capacidades de Nx para controlar dependencias y validar cambios afectados.
10. Favorecer soluciones simples, mantenibles y observables, evitando sobreingeniería.

## 4. Estado arquitectónico

### 4.1 Implementación actual

- Los dos portales conservan principalmente el scaffolding inicial de Nx/Next.js.
- La API expone endpoints básicos y un módulo de salud.
- La API usa Passport JWT y JWKS para validar tokens de Microsoft Entra ID.
- La autorización por roles y su aplicación a un endpoint protegido permanecen como **Implementación futura**.
- Existe un alias público `@nexus/config` para la librería `libs/config`.
- Existe un módulo independiente de configuración Auth con el subpath `@nexus/config/auth`.
- `JwtStrategy` consume `getAuthConfig()` y solo requiere `AZURE_TENANT_ID` y `AZURE_CLIENT_ID`.
- `getAppConfig()` y `NexusConfig` permanecen disponibles como compatibilidad temporal legacy.
- Nx infiere targets de Next.js, Jest, Playwright, ESLint y Webpack mediante plugins.
- Los proyectos no tienen tags arquitectónicos configurados.
- No existen todavía librerías de dominio, aplicación, contratos, UI o integraciones.

### 4.2 Arquitectura propuesta

- Frontends enfocados exclusivamente en presentación, interacción y composición de experiencia.
- API organizada por capacidades de negocio y casos de uso.
- Dominio independiente de NestJS, Next.js, Azure y SDK externos.
- Integraciones externas encapsuladas mediante puertos y adaptadores.
- Librerías Nx pequeñas, cohesivas, con puntos de entrada públicos y límites verificables.
- Observabilidad transversal sin contaminar la lógica de negocio.

## 5. Arquitectura por capas

Estado: **Arquitectura propuesta**. ADR-001 no aprueba esta organización por capas.

La arquitectura propuesta de NEXUS organiza las siguientes capas lógicas.

### 5.1 Presentación

Responsabilidades:

- Renderizar interfaces y exponer endpoints HTTP.
- Recibir, validar estructuralmente y transformar entradas.
- Traducir resultados de aplicación a respuestas de presentación.
- Gestionar navegación, interacción y estado estrictamente visual en los portales.

Incluye:

- Pages, layouts, Server Components y Client Components de Next.js.
- Controllers, guards de transporte, pipes y DTO HTTP de NestJS.

Reglas:

- No contiene lógica de negocio.
- Los Controllers deben ser delgados.
- Los React Components no acceden directamente a Dataverse, Business Central, SharePoint ni secretos.
- La presentación depende de la capa de aplicación, no de implementaciones de infraestructura.

### 5.2 Aplicación

Responsabilidades:

- Implementar casos de uso.
- Coordinar reglas de dominio y puertos de infraestructura.
- Definir límites transaccionales y políticas de orquestación.
- Aplicar autorización contextual cuando dependa del caso de uso.

Reglas:

- No conoce detalles de HTTP, React ni SDK concretos de proveedores.
- Depende del dominio y de abstracciones, no de adaptadores concretos.
- Cada caso de uso debe expresar una intención de negocio clara.

**Arquitectura propuesta:** esta capa todavía no está materializada como librerías o módulos independientes y requiere aprobación mediante ADR antes de establecer nuevos límites estructurales.

### 5.3 Dominio

Responsabilidades:

- Representar entidades, value objects, reglas, invariantes y políticas del negocio.
- Mantener comportamiento empresarial independiente de frameworks y persistencia.
- Definir interfaces o puertos cuando su propiedad corresponda al dominio.

Reglas:

- No depende de NestJS, Next.js, bases de datos, Azure ni clientes HTTP.
- No contiene DTO de transporte ni objetos específicos de proveedores.
- Debe poder probarse sin infraestructura externa.

**Arquitectura propuesta:** el repositorio todavía no contiene un modelo de dominio explícito.

### 5.4 Infraestructura

Responsabilidades:

- Implementar adaptadores para Dataverse, Business Central, SharePoint, Azure y otros servicios externos.
- Resolver persistencia, mensajería, telemetría y acceso a configuración server-side.
- Convertir modelos externos a contratos internos y viceversa.

Reglas:

- Implementa puertos definidos por capas internas.
- Los SDK y esquemas externos no deben propagarse al dominio ni al frontend.
- Los adaptadores deben manejar timeouts, errores, reintentos seguros y observabilidad según corresponda.

**Arquitectura propuesta:** los adaptadores empresariales todavía no están implementados.

### 5.5 Dirección de dependencias

La dirección lógica permitida es:

```text
Presentacion ---> Aplicacion ---> Dominio
                       ^
                       |
                Infraestructura
                implementa puertos
```

El dominio permanece en el centro y no depende de capas externas.

## 6. Arquitectura Nx Monorepo

Nx es la unidad de organización, ejecución y análisis de dependencias del repositorio.

La adopción de Nx Monorepo con `customer-portal`, `admin-portal`, `api` y librerías compartidas es **Arquitectura vigente**, respaldada por ADR-001 con estado **Aceptado**.

Reglas generales:

- Las aplicaciones son composition roots y ensamblan librerías.
- La lógica reutilizable o de negocio debe residir en librerías cohesivas.
- Un proyecto solo puede consumir la API pública de otro proyecto.
- No se permiten imports relativos que atraviesen la raíz de un proyecto.
- Los targets específicos o `affected` deben preferirse para validación.
- Las dependencias entre proyectos deben ser visibles en el grafo de Nx.

### 6.1 Estado actual

Los proyectos se encuentran mayoritariamente en la raíz del repositorio y `libs/config` es la única librería compartida. Los `project.json` contienen `tags: []`, por lo que las reglas actuales de límites no expresan restricciones reales por tipo, scope o plataforma.

### 6.2 Arquitectura propuesta de tags

Cuando se introduzcan nuevas librerías, deben clasificarse con tags equivalentes a:

- Tipo: `type:app`, `type:feature`, `type:application`, `type:domain`, `type:data-access`, `type:ui`, `type:util`.
- Scope: `scope:admin`, `scope:customer`, `scope:api`, `scope:shared`.
- Plataforma: `platform:browser`, `platform:server`, `platform:isomorphic`.

La adopción de estos tags y sus restricciones en ESLint es una **Arquitectura propuesta** y una posible **Implementación futura**; no está aprobada por ADR-001.

## 7. Estructura de aplicaciones

### 7.1 `admin-portal`

- Presenta la experiencia administrativa.
- Usa Next.js App Router.
- Debe consumir capacidades backend mediante contratos publicados por la API.
- No debe contener credenciales ni clientes directos de sistemas empresariales.

La autenticación frontend con MSAL es una **Implementación futura**; las dependencias están declaradas, pero no existe flujo implementado en el código actual.

### 7.2 `customer-portal`

- Presenta la experiencia para clientes.
- Usa Next.js App Router.
- Comparte las mismas restricciones de seguridad y acceso a datos que el portal administrativo.

La autenticación frontend y los flujos empresariales son una **Implementación futura**.

### 7.3 `api`

- Actúa como límite de seguridad y punto de acceso a capacidades empresariales.
- Usa NestJS y un prefijo global `/api/v1`.
- Ya dispone de validación global, filtro de excepciones, interceptor de logging, Swagger, health checks y validación JWT.
- Debe orquestar casos de uso y ocultar detalles de proveedores externos.

Los módulos funcionales de Dataverse, Business Central y SharePoint son una **Implementación futura**.

### 7.4 Proyectos E2E

- Los proyectos `*-e2e` validan los límites desplegables de cada aplicación.
- No deben contener lógica productiva.
- Deben probar flujos críticos sin acoplarse a detalles internos.

Las pruebas actuales son iniciales y no representan todavía flujos empresariales completos.

## 8. Estructura de librerías

### 8.1 Implementación actual parcial de configuración

`libs/config` contiene actualmente un primer módulo independiente para Auth. El flujo real de autenticación en el working tree es:

```text
JwtStrategy
  -> @nexus/config/auth
  -> getAuthConfig()
  -> loadAuthConfig()
  -> validateAuthEnvironment()
  -> AZURE_TENANT_ID + AZURE_CLIENT_ID
```

`JwtStrategy` consume `getAuthConfig()` y mantiene `AZURE_CLIENT_ID` como audience. Su inicialización ya no valida ni carga configuración de Dataverse, Business Central, Azure Storage o Azure Key Vault.

El módulo Auth incluye contrato, validador, loader, servicio con caché independiente, error de configuración, lector server-side y pruebas. `.ai/config-module-standard.md` documenta este patrón como estándar para módulos futuros.

La configuración global legacy continúa disponible temporalmente mediante:

```text
@nexus/config
  -> getAppConfig()
  -> validateRequiredEnvironmentVariables()
  -> loadAppConfig()
  -> NexusConfig global
```

No se encontraron consumidores activos de `getAppConfig()` en el working tree después de migrar `JwtStrategy`, pero la función, el contrato `NexusConfig` y sus exports permanecen para compatibilidad temporal. Debe repetirse el inventario antes de eliminarlos.

Azure Key Vault, Azure Storage, Dataverse, Business Central y Observability todavía no tienen módulos de configuración independientes ni adaptadores funcionales implementados. Este estado se clasifica como **Implementación actual parcial** y **deuda técnica conocida**.

No existe evidencia de que `libs/config` se importe actualmente desde los portales. La separación Browser/Server completa tampoco es un control vigente: existe un subpath específico para Auth, pero aún no existe un punto de entrada browser ni límites automatizados entre plataformas.

### 8.2 Problema arquitectónico

El acoplamiento directo de `JwtStrategy` con la configuración global fue eliminado. Sin embargo, la API legacy aún agrega módulos con necesidades distintas y conserva una validación all-or-nothing para cualquier consumidor que vuelva a utilizarla.

La API global restante no representa la arquitectura deseada y no debe usarse como precedente para nuevos consumidores.

### 8.3 Arquitectura vigente e implementación incremental de configuración

Estado de la decisión: **Arquitectura vigente**, aprobada mediante ADR-002 con estado **Aceptado**.

Estado de implementación: **Parcial e incremental**. La aceptación de la decisión no implica que sus módulos, fronteras y retiros legacy ya estén implementados.

- **Implementado:** cargador, validador, contrato y caché independientes para Auth.
- **Implementado:** contrato mínimo de Auth consumido por `JwtStrategy` mediante `getAuthConfig()`.
- **Implementado:** estándar técnico reutilizable en `.ai/config-module-standard.md`.
- **Pendiente:** configuración modular de Observability, Storage, Key Vault, Dataverse y Business Central, únicamente cuando exista un consumidor real autorizado.
- **Pendiente:** separar completamente configuración pública de frontend, configuración server-side no secreta y secretos server-side.
- **Pendiente:** exponer y verificar puntos de entrada públicos separados para Browser y Server.
- **Pendiente:** impedir mediante controles verificables que Browser importe secretos o loaders de `process.env`.
- **Pendiente:** retirar `getAppConfig()`, `NexusConfig` y los exports legacy después de confirmar que no existen consumidores.

La transición debe conservar compatibilidad mientras se migran consumidores y debe contar con validaciones que demuestren que la ausencia de variables no relacionadas no bloquea la autenticación.

### 8.4 Arquitectura propuesta de librerías

Las nuevas librerías deben crearse por necesidad real y responsabilidad cohesiva. Las categorías objetivo son:

```text
libs/
|-- shared/
|   |-- contracts/
|   |-- ui/
|   `-- util/
|-- <capacidad>/
|   |-- domain/
|   |-- application/
|   `-- data-access/
|-- integrations/
|   |-- dataverse/
|   |-- business-central/
|   `-- sharepoint/
`-- config/
    |-- browser/
    `-- server/
```

Esta estructura es una **Arquitectura propuesta** y no autoriza la creación anticipada de librerías vacías ni se considera aprobada sin un ADR aceptado.

## 9. Reglas de dependencias entre proyectos

Estado: **Arquitectura propuesta**. Las restricciones detalladas requieren aprobación mediante ADR y controles ejecutables antes de considerarse arquitectura vigente.

La arquitectura propuesta plantea estas reglas:

1. Las aplicaciones pueden depender de librerías, pero no de otras aplicaciones.
2. Las librerías de presentación pueden depender de aplicación, contratos, UI y utilidades compatibles con su plataforma.
3. Las librerías de aplicación pueden depender de dominio, contratos internos y puertos.
4. Las librerías de dominio solo pueden depender de otras librerías de dominio o utilidades puras justificadas.
5. Las librerías de infraestructura pueden depender de dominio y aplicación para implementar sus puertos.
6. Las librerías browser no pueden depender de librerías server.
7. Los adaptadores de una integración no pueden ser importados directamente por los portales.
8. Ningún proyecto debe importar archivos internos de otro proyecto fuera de su punto de entrada público.
9. Las dependencias circulares están prohibidas.
10. Las excepciones requieren una decisión documentada en `.ai/adr/`.

## 10. Flujo Frontend -> API -> Dataverse -> Business Central

### 10.1 Estado actual

El flujo empresarial completo no está implementado. Los portales no consumen todavía capacidades reales de la API y la API no contiene clientes funcionales para Dataverse o Business Central.

### 10.2 Arquitectura propuesta

El flujo solicitado debe respetar la siguiente secuencia lógica:

1. El frontend obtiene una identidad válida mediante Microsoft Entra ID.
2. El frontend envía una solicitud HTTPS a la API con el token correspondiente.
3. La API valida identidad, audiencia, emisor, permisos, entrada y contexto.
4. Un caso de uso de aplicación coordina la operación.
5. Un puerto interno invoca el adaptador de Dataverse cuando el caso de uso requiere sus datos o capacidades.
6. Si el caso de uso también requiere Business Central, la coordinación se realiza desde la capa de aplicación a través de su adaptador; Dataverse no debe convertirse por defecto en un proxy técnico de Business Central.
7. La API transforma el resultado a un contrato estable y lo devuelve al frontend.

La propiedad de cada dato, el orden transaccional y las reglas de sincronización entre Dataverse y Business Central deben definirse por caso de uso y documentarse mediante ADR antes de implementarse.

## 11. Integración con Microsoft Entra ID

### 11.1 Implementación actual

- La API extrae bearer tokens mediante Passport JWT.
- Valida audiencia e issuer configurados.
- Acepta únicamente tokens firmados con RS256.
- Obtiene claves públicas mediante el endpoint JWKS de Microsoft.
- Usa caché y rate limiting para solicitudes JWKS.
- Valida la presencia de `sub` y `tid`.
- Existe un guard JWT; el guard de roles y su aplicación a un endpoint protegido permanecen como **Implementación futura**.
- Obtiene tenant y client ID mediante `getAuthConfig()` sin depender de la configuración de integraciones no utilizadas.

### 11.2 Arquitectura propuesta

- Los portales autentican usuarios mediante MSAL sin manejar secretos de cliente.
- La API protege por defecto las rutas privadas y declara explícitamente las públicas.
- La autorización diferencia scopes, app roles y reglas contextuales.
- Los identificadores del token se tratan como claims de identidad, no como sustitutos del modelo de autorización de negocio.
- Los logs nunca incluyen tokens completos ni claims sensibles innecesarios.

La autenticación frontend y la protección global por defecto son una **Implementación futura**.

## 12. Azure Key Vault

El repositorio contiene una URL de Key Vault dentro de la configuración, pero no existe un cliente o proveedor de secretos implementado.

**Arquitectura propuesta:**

- Las cargas de trabajo server-side obtienen secretos mediante identidad administrada cuando el entorno lo permita.
- Solo la infraestructura server-side puede acceder a Key Vault.
- Los secretos no se almacenan en el repositorio, no se envían al frontend y no se registran.
- La aplicación depende de abstracciones de configuración, no del SDK de Key Vault fuera del adaptador.
- La estrategia de caché, renovación y tolerancia a fallos debe definirse antes de implementar el proveedor.

La integración operativa es una **Implementación futura**.

## 13. Application Insights

La configuración admite opcionalmente una connection string de Application Insights, pero el repositorio no contiene instrumentación con su SDK.

**Arquitectura propuesta:**

- Centralizar telemetría mediante una abstracción de observabilidad.
- Correlacionar solicitudes entre frontend, API y adaptadores externos.
- Registrar métricas, dependencias, errores y duración sin exponer datos sensibles.
- Mantener logging estructurado y consistente.
- Definir sampling, retención y redacción de datos según los requisitos operativos y de cumplimiento.

La instrumentación de Application Insights es una **Implementación futura**.

## 14. SharePoint

No existe actualmente configuración, cliente ni módulo de SharePoint en el repositorio.

**Arquitectura propuesta:**

- El acceso a SharePoint se realiza desde la API mediante un adaptador server-side.
- Los portales no acceden directamente con credenciales privilegiadas.
- El adaptador encapsula autenticación, API externa, paginación, errores y transformación de modelos.
- Los permisos siguen el principio de mínimo privilegio.
- La propiedad documental, metadatos, límites de archivos y operaciones admitidas deben definirse antes de implementar la integración.

La integración con SharePoint es una **Implementación futura**.

## 15. Principios SOLID

Estado: guía de diseño para la **Arquitectura propuesta**; no amplía el alcance aprobado de ADR-001.

NEXUS aplica SOLID cuando aporta claridad y desacoplamiento:

- **Responsabilidad única:** cada módulo, clase y librería tiene una razón principal para cambiar.
- **Abierto/cerrado:** las capacidades se extienden mediante contratos y adaptadores sin modificar innecesariamente el núcleo.
- **Sustitución de Liskov:** las implementaciones respetan completamente los contratos que implementan.
- **Segregación de interfaces:** los consumidores dependen de interfaces pequeñas y específicas.
- **Inversión de dependencias:** aplicación y dominio dependen de abstracciones; infraestructura proporciona implementaciones.

SOLID no debe utilizarse para justificar capas, interfaces o factorías sin una necesidad concreta.

## 16. Clean Architecture

Estado: **Arquitectura propuesta**.

La Clean Architecture de NEXUS se rige por la independencia del dominio y la dirección de dependencias hacia el interior.

Reglas:

- El dominio no conoce frameworks ni proveedores.
- Los casos de uso no conocen detalles de transporte.
- Los Controllers y Components adaptan entradas y salidas, pero no deciden reglas de negocio.
- Los adaptadores externos son reemplazables detrás de puertos explícitos.
- Los modelos de Dataverse, Business Central o SharePoint no atraviesan directamente las capas internas.
- Los límites deben aportar valor verificable; se evita la abstracción ceremonial.

La separación física completa por librerías es una **Arquitectura propuesta** que, si se aprueba mediante ADR, debe introducirse gradualmente junto con capacidades reales.

## 17. Estrategia de modularidad

Estado: **Arquitectura propuesta**.

- Organizar módulos alrededor de capacidades de negocio, no únicamente por tipo técnico.
- Mantener módulos pequeños, cohesivos y con API pública mínima.
- Evitar módulos globales salvo para infraestructura transversal justificada.
- Encapsular cada integración externa en su propio adaptador.
- Dividir un módulo cuando existan responsabilidades, ciclos de cambio o requisitos de despliegue claramente diferentes.
- Registrar cambios estructurales relevantes mediante ADR.

NEXUS continuará inicialmente como monolito modular dentro del monorepo. La separación en servicios independientes solo se evaluará con evidencia operativa o de dominio.

## 18. Estrategia de reutilización

Estado: **Arquitectura propuesta**.

- Reutilizar contratos y comportamiento estable, no coincidencias accidentales.
- Extraer código compartido después de identificar una responsabilidad común real.
- Mantener componentes UI compartidos libres de reglas específicas de un portal.
- Evitar librerías genéricas que acumulen responsabilidades sin propietario.
- Publicar únicamente símbolos necesarios mediante puntos de entrada explícitos.
- Preferir composición sobre herencia para compartir comportamiento.

La creación de librerías compartidas adicionales es una **Implementación futura** guiada por demanda real.

## 19. Estrategia de escalabilidad

Estado: **Arquitectura propuesta**.

- Escalar primero mediante límites modulares claros y operaciones stateless cuando sea posible.
- Mantener la API apta para múltiples instancias sin estado mutable local requerido para corrección.
- Aislar integraciones para controlar concurrencia, cuotas y fallos por proveedor.
- Diseñar paginación y procesamiento por lotes cuando los casos de uso lo requieran.
- Introducir caché, colas o procesamiento asíncrono solo con requisitos medidos.
- Usar Nx para limitar el costo de validación al conjunto afectado sin perder seguridad.

No existe actualmente infraestructura de escalado, colas o caché de negocio en el código; cualquier incorporación será una **Implementación futura**.

## 20. Estrategia de rendimiento

Estado: **Arquitectura propuesta**.

- Medir antes de optimizar.
- Evitar consultas duplicadas y llamadas repetitivas a integraciones.
- Reducir renders innecesarios y JavaScript de cliente en Next.js.
- Preferir Server Components cuando no sea necesaria interacción en el browser.
- Aplicar paginación, selección de campos y límites en accesos externos.
- Configurar timeouts y reutilización segura de conexiones en adaptadores.
- Evitar dependencias pesadas, código muerto y optimización prematura.
- Documentar compromisos que intercambien rendimiento por consistencia o frescura de datos.

No se presupone ninguna estrategia de caché hasta que los patrones de uso estén definidos y medidos.

## 21. Estrategia de seguridad

Estado: **Arquitectura propuesta**, excepto los controles que ya formen parte de la implementación actual o de una decisión aceptada independiente.

- Aplicar mínimo privilegio en identidades, roles y permisos externos.
- Validar autenticación, autorización y entradas en la API.
- Mantener secretos exclusivamente en límites server-side autorizados.
- Separar configuración browser y server.
- Usar HTTPS en comunicaciones externas.
- No registrar tokens, secretos, credenciales ni datos sensibles innecesarios.
- Redactar información sensible en errores y telemetría.
- Mantener dependencias al mínimo y revisar su necesidad y procedencia.
- Definir timeouts, límites de tamaño y manejo seguro de fallos.
- Proteger las rutas privadas por defecto como arquitectura propuesta.
- Documentar amenazas o excepciones relevantes antes de introducir integraciones.

Las reglas ampliadas se mantienen en `.ai/security.md`.

## 22. Diagrama de arquitectura

El siguiente diagrama representa la arquitectura propuesta. Salvo la estructura Nx aprobada por ADR-001, sus elementos no se consideran decisiones aprobadas automáticamente. Los bloques de integraciones externas no implican que sus adaptadores ya estén implementados.

```text
+-------------------------+        +-------------------------+
|      Admin Portal       |        |     Customer Portal     |
| Next.js App Router      |        | Next.js App Router      |
| Presentacion            |        | Presentacion            |
+------------+------------+        +------------+------------+
             | HTTPS + token Entra ID            |
             +------------------+-----------------+
                                |
                                v
                  +-------------+-------------+
                  |         NEXUS API         |
                  |          NestJS           |
                  | Presentacion HTTP         |
                  +-------------+-------------+
                                |
                                v
                  +-------------+-------------+
                  | Casos de uso / Aplicacion |
                  +-------------+-------------+
                                |
                                v
                  +-------------+-------------+
                  |          Dominio          |
                  | Reglas y contratos        |
                  +-------------+-------------+
                                ^
                                |
                  +-------------+-------------+
                  | Infraestructura / Adapters|
                  +--+----------+----------+---+
                     |          |          |
          +----------+--+  +----+------+  +----+------+
          | Dataverse   |  | Business  |  | SharePoint|
          | futuro      |  | Central   |  | futuro    |
          +-------------+  | futuro    |  +-----------+
                           +-----------+

                  +---------------------------+
                  | Servicios transversales   |
                  | Entra ID: parcial actual  |
                  | Key Vault: futuro         |
                  | App Insights: futuro      |
                  +---------------------------+
```

## 23. Evolución y gobierno

- Toda decisión que altere límites, dirección de dependencias, propiedad de datos o estrategia de integración debe documentarse en `.ai/adr/`.
- La arquitectura propuesta solo debe implementarse después de la aprobación correspondiente y de forma incremental cuando una capacidad real la necesite.
- El grafo de Nx, las reglas de lint y las pruebas deben convertirse progresivamente en controles ejecutables de esta arquitectura.
- Este documento debe actualizarse cuando el estado implementado cambie, evitando presentar planes como funcionalidades existentes.
