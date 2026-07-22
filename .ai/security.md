# Estándar de seguridad de NEXUS

## 1. Propósito y alcance

Este documento define las reglas oficiales de seguridad para el código, la configuración, las integraciones y la operación de NEXUS. Aplica a todos los proyectos del Nx Monorepo, sus pipelines y cualquier agente humano o automatizado que intervenga en ellos.

Estas reglas complementan `.ai/AGENTS.md`, `.ai/architecture.md` y `.ai/coding-standards.md`. No sustituyen evaluaciones de riesgo, cumplimiento, privacidad ni requisitos contractuales aplicables.

La implementación actual incluye validación JWT con Microsoft Entra ID en la API. La autorización por rol en endpoints y la autenticación frontend no forman parte del código publicado; las integraciones operativas con Azure Key Vault, Application Insights, Dataverse, Business Central y SharePoint son parciales o futuras.

## 2. Principios generales de seguridad

- Aplicar seguridad por diseño y por defecto.
- Tratar toda entrada, identidad, red y proveedor externo como no confiable hasta validarlos.
- Aplicar defensa en profundidad; ningún control individual se considera suficiente.
- Usar mínimo privilegio y separación de responsabilidades.
- Denegar por defecto y autorizar explícitamente.
- Reducir superficie de ataque, dependencias y exposición de datos.
- Mantener separados browser, servidor, dominio e infraestructura.
- No depender de ocultar código, rutas o identificadores como control de seguridad.
- Registrar decisiones y excepciones relevantes mediante ADR y revisión de seguridad.
- Corregir vulnerabilidades según riesgo y evidencia, no solo según conveniencia.

## 3. Microsoft Entra ID

- Microsoft Entra ID es el proveedor de identidad previsto para NEXUS.
- Registrar aplicaciones distintas cuando los límites de confianza, audiencias o permisos sean diferentes.
- Los portales deben actuar como clientes públicos y no almacenar secretos de cliente.
- La API debe validar tokens destinados explícitamente a su audiencia.
- Restringir tenants conforme al modelo empresarial aprobado; no aceptar tenants arbitrarios.
- Usar app roles para permisos de aplicación o negocio y scopes para acceso delegado a APIs.
- No usar grupos, nombres visibles o correos como único identificador estable de autorización.
- Revisar consentimientos, service principals, propietarios y credenciales periódicamente.
- Preferir identidades administradas para cargas de trabajo Azure cuando estén disponibles.
- Los cambios en registros de aplicaciones, tenants o permisos requieren autorización específica.

## 4. OAuth 2.0 y OpenID Connect

- Usar OpenID Connect para autenticación y OAuth 2.0 para autorización de acceso a recursos.
- Los portales deben usar Authorization Code Flow con PKCE.
- No usar Implicit Flow ni Resource Owner Password Credentials Flow.
- Validar `state` para proteger el flujo de autorización y `nonce` para vincular la respuesta de identidad.
- Solicitar únicamente scopes necesarios para el caso de uso.
- No enviar tokens en URLs, query strings, logs ni herramientas de analítica.
- Mantener redirect URIs exactas, HTTPS y registradas; no usar patrones amplios.
- Aplicar tiempos de vida y renovación según la política de identidad aprobada.
- No confundir ID tokens con access tokens: la API solo acepta access tokens apropiados.
- Las credenciales de cliente, si una integración confidencial las requiere, permanecen exclusivamente en el servidor.

## 5. JWT

- Validar firma, algoritmo, issuer, audience, expiración y vigencia antes de confiar en un JWT.
- Aceptar únicamente algoritmos permitidos explícitamente; nunca aceptar `none` ni seleccionar el algoritmo desde datos no confiables.
- Validar los claims requeridos para identidad y autorización, incluidos tenant y subject cuando correspondan.
- No considerar seguro un token únicamente porque puede decodificarse.
- Obtener claves desde endpoints JWKS confiables y usar caché con soporte de rotación.
- Limitar solicitudes JWKS para evitar abuso y degradación.
- Aplicar tolerancia de reloj mínima y documentada.
- No registrar tokens completos ni devolverlos en errores.
- No introducir datos sensibles innecesarios dentro de claims.
- Tratar la revocación y el cambio de permisos según el riesgo y vida útil de los tokens.

La API ya restringe tokens a RS256, issuer, audience y JWKS. Cualquier ampliación debe conservar o endurecer estos controles.

## 6. Roles y autorización

- Autenticación no equivale a autorización.
- Comprobar autorización en la API para cada operación protegida.
- Proteger rutas privadas por defecto y declarar explícitamente las públicas como arquitectura propuesta.
- No confiar en roles, flags o controles visuales enviados por el frontend.
- Aplicar autorización a nivel de recurso para evitar acceso horizontal indebido.
- Diferenciar app roles, scopes y políticas de negocio.
- Centralizar nombres de permisos y evitar strings duplicados.
- Denegar acceso cuando falten claims, contexto o políticas requeridas.
- Probar casos autorizados, no autorizados y de escalamiento horizontal y vertical.
- Documentar roles, propietarios y criterios de asignación.

## 7. Principio de mínimo privilegio

- Conceder a usuarios, aplicaciones e identidades únicamente los permisos necesarios.
- Separar permisos de lectura, escritura, administración y operación.
- Evitar permisos amplios cuando existan permisos específicos.
- No reutilizar identidades privilegiadas entre entornos o integraciones.
- Limitar acceso humano a secretos y sistemas productivos.
- Revisar y retirar permisos obsoletos.
- Usar acceso temporal o just-in-time cuando la plataforma lo permita.
- Mantener separación entre desarrollo, QA y producción.
- Toda excepción debe tener propietario, justificación y fecha de revisión.

## 8. Gestión de secretos

- No almacenar secretos en el repositorio, código, documentación, tests, fixtures ni historial Git.
- No mostrar secretos en terminales compartidas, respuestas de agentes, logs o capturas.
- No enviar secretos al frontend ni incluirlos en bundles.
- No usar secretos reales en desarrollo o pruebas automatizadas.
- Rotar un secreto inmediatamente si se sospecha exposición.
- Definir propietario, propósito, consumidores y ciclo de vida de cada secreto.
- Preferir identidad administrada, federación o credenciales de corta duración frente a secretos estáticos.
- No copiar secretos entre entornos.
- Los agentes de IA no pueden crear, leer, revelar, rotar ni modificar secretos sin autorización explícita y específica.

## 9. Azure Key Vault

La integración operativa con Azure Key Vault es una **Implementación futura**.

Cuando se implemente:

- Acceder desde componentes server-side autorizados, nunca desde el browser.
- Preferir identidad administrada y Azure RBAC con mínimo privilegio.
- Separar vaults o permisos por entorno y nivel de sensibilidad.
- No listar secretos cuando solo sea necesario obtener uno conocido.
- No registrar nombres sensibles, valores, versiones ni respuestas del servicio.
- Definir caché, renovación, disponibilidad y comportamiento ante fallos.
- Habilitar auditoría y alertas sobre accesos anómalos.
- Restringir la exposición de red conforme a la arquitectura de infraestructura aprobada.
- Los cambios de vault, permisos o red requieren autorización de infraestructura.

## 10. Variables de entorno

### 10.1 Implementación actual parcial

En el código publicado, `JwtStrategy` obtiene la configuración de Microsoft Entra ID mediante `getAuthConfig()` desde `@nexus/config/auth`. El módulo Auth valida únicamente `AZURE_TENANT_ID` y `AZURE_CLIENT_ID`.

`getAppConfig()` y `NexusConfig` permanecen disponibles por compatibilidad temporal y conservan el contrato global con variables de aplicación, `AZURE_CLIENT_SECRET`, Azure Key Vault, Azure Storage, Dataverse y Business Central.

El desacoplamiento de Auth está implementado. El retiro del contrato legacy y la separación Browser/Server completa permanecen pendientes conforme a ADR-002.

### 10.2 Riesgos conocidos

- **Despliegue:** los consumidores legacy de la configuración global pueden seguir requiriendo variables de integraciones que no utilizan funcionalmente.
- **Mantenibilidad:** un consumidor nuevo o migrado incorrectamente hacia la configuración global puede reintroducir acoplamiento entre módulos.
- **Mínimo privilegio:** un objeto global distribuye acceso potencial a más configuración y secretos de los necesarios para cada consumidor.
- **Exposición accidental:** un punto de entrada no separado por plataforma aumenta el riesgo de que código server-side o tipos asociados a secretos se importen desde un proyecto de navegador.
- **Validación engañosa:** la presencia de una variable no demuestra que la integración correspondiente esté implementada ni operativa.

No se observó un consumo actual de `libs/config` desde los portales. Por tanto, no se afirma una exposición efectiva al browser; el riesgo reside en la falta de una frontera técnica que la impida.

### 10.3 Control aceptado e implementación incremental

Estado: **Arquitectura vigente** por ADR-002 e **Implementación actual parcial**. Auth ya está aislado; la separación Browser/Server completa y los demás módulos permanecen pendientes.

- Usar cargadores y validadores independientes por dominio o módulo; Auth ya aplica este patrón.
- Separar configuración pública de frontend, configuración server-side y secretos.
- Validar variables únicamente desde el módulo que las utiliza.
- Mantener `JwtStrategy` independiente de configuración de Dataverse, Business Central, Azure Storage o Azure Key Vault salvo una necesidad real y documentada.
- Publicar puntos de entrada distintos para configuración browser y server.
- Hacer imposible que el punto de entrada browser exporte secretos, client secrets, loaders server-side o acceso genérico a `process.env`.
- Mantener secretos disponibles únicamente para adaptadores server-side autorizados y con el contrato mínimo necesario.

### 10.4 Reglas generales

- Las variables de entorno contienen referencias de configuración, no deben convertirse en un almacén informal de secretos.
- No modificar archivos o variables de entornos reales sin autorización.
- Mantener listas separadas de variables públicas y server-side mientras se completa el control aceptado.
- En Next.js, solo exponer variables explícitamente públicas y nunca usar ese mecanismo para secretos.
- Validar presencia, formato y rango al iniciar el componente que las necesita.
- Cada módulo debe requerir únicamente su propia configuración.
- No registrar el entorno completo ni imprimir variables para depuración.
- Los archivos de ejemplo deben usar placeholders inequívocos sin valores utilizables.
- No utilizar defaults inseguros para credenciales, endpoints o controles de seguridad.

## 11. Validación de entradas

- Validar toda entrada en el límite de confianza donde ingresa.
- Aplicar listas permitidas, tipos, rangos, longitudes, formatos y tamaños máximos.
- Rechazar propiedades desconocidas cuando el contrato sea cerrado.
- Validar cuerpos, parámetros de ruta, query strings, headers, cookies, archivos y webhooks.
- Normalizar únicamente después de validar y evitar normalizaciones ambiguas.
- Validar respuestas de servicios externos antes de tratarlas como modelos internos.
- No confiar en el tipado TypeScript como validación en tiempo de ejecución.
- Mantener reglas estructurales separadas de reglas de negocio.
- Limitar profundidad, cantidad de elementos y tamaño de payload para prevenir agotamiento de recursos.

La API ya usa `ValidationPipe` global con whitelist, transformación y rechazo de propiedades no permitidas; estos controles no deben debilitarse.

## 12. Protección contra XSS

- Confiar en el escape automático de React y no eludirlo sin necesidad demostrada.
- Evitar `dangerouslySetInnerHTML`; si es imprescindible, sanitizar con una solución revisada y una política explícita.
- No construir HTML, scripts o URLs ejecutables mediante concatenación de datos no confiables.
- Aplicar Content Security Policy restrictiva y basada en orígenes autorizados.
- Evitar scripts inline y mecanismos que requieran `unsafe-eval` o `unsafe-inline`.
- Validar y normalizar URLs antes de renderizarlas como enlaces.
- Codificar la salida según el contexto: HTML, atributo, URL, JavaScript o CSS.
- No almacenar tokens o secretos en contenido accesible a scripts del browser.
- Probar entradas persistentes y reflejadas en flujos que muestran contenido externo.

## 13. Protección contra CSRF

- Evaluar CSRF siempre que el browser envíe credenciales automáticamente, especialmente cookies.
- Para autenticación basada en cookies, usar `SameSite`, `Secure`, `HttpOnly` y protección anti-CSRF apropiada.
- Validar Origin o Referer en operaciones sensibles cuando corresponda.
- No usar solicitudes GET para mutaciones.
- Evitar side effects en cargas de recursos o navegación.
- Los bearer tokens enviados explícitamente en `Authorization` reducen la exposición a CSRF, pero no reemplazan validación de CORS, XSS y origen.
- Proteger Route Handlers y Server Actions según su mecanismo real de sesión.
- No desactivar controles CSRF para resolver problemas de integración sin análisis documentado.

## 14. Protección contra SQL Injection

- No construir consultas mediante concatenación o interpolación de datos no confiables.
- Usar consultas parametrizadas, APIs tipadas u ORM con binding seguro.
- No permitir que el cliente seleccione libremente columnas, tablas, operadores u ordenamientos.
- Validar mediante allowlists cualquier identificador que no pueda parametrizarse.
- Aplicar mínimo privilegio a identidades de acceso a datos.
- No devolver errores internos del motor de datos al cliente.
- Incluir pruebas de inyección en límites que acepten filtros o expresiones.

NEXUS no contiene actualmente una base SQL implementada. Estas reglas aplican a cualquier **Implementación futura** que incorpore una.

## 15. Protección contra Command Injection

- No ejecutar comandos del sistema con datos proporcionados por usuarios o proveedores.
- Preferir APIs de plataforma en lugar de invocar shells.
- Si una ejecución es imprescindible, usar argumentos estructurados, comandos permitidos y validación estricta.
- No concatenar comandos ni permitir operadores, redirecciones o expansión de shell.
- Ejecutar procesos con una identidad sin privilegios y límites de tiempo y recursos.
- No incluir secretos en argumentos de procesos.
- Registrar la operación de forma segura sin reproducir datos sensibles.

## 16. Protección contra SSRF

- No aceptar URLs arbitrarias para solicitudes realizadas por el servidor.
- Usar allowlists de esquemas, hosts, puertos y rutas cuando el destino sea configurable.
- Permitir únicamente HTTPS salvo necesidad interna documentada.
- Bloquear loopback, metadata services, redes privadas y destinos link-local cuando no sean destinos autorizados.
- Resolver y volver a validar el destino para mitigar redirecciones y DNS rebinding.
- Limitar redirecciones, timeout, tamaño de respuesta y cantidad de bytes descargados.
- No reenviar headers de autorización o cookies a destinos diferentes.
- Mantener endpoints de Dataverse, Business Central, SharePoint y Azure en configuración server-side validada.

## 17. Protección contra Path Traversal

- No construir rutas de archivos mediante concatenación de entrada no confiable.
- Usar identificadores internos en lugar de nombres de ruta proporcionados por clientes.
- Normalizar y resolver la ruta antes de acceder al sistema de archivos.
- Verificar que la ruta resuelta permanezca dentro del directorio permitido.
- Rechazar rutas absolutas, segmentos `..`, separadores alternativos y codificaciones ambiguas.
- Aplicar allowlists de extensiones y límites de tamaño cuando se manejen archivos.
- No confiar únicamente en el nombre o MIME enviado por el cliente.

## 18. CORS

- CORS es una política del browser, no un mecanismo de autenticación.
- Configurar una allowlist exacta de orígenes por entorno.
- No reflejar automáticamente el header `Origin`.
- No combinar credenciales con origen wildcard.
- Permitir únicamente métodos y headers necesarios.
- Mantener preflight y caché dentro de límites apropiados.
- Rechazar orígenes desconocidos y registrar señales anómalas sin datos sensibles.
- La configuración abierta actual de la API debe considerarse pendiente de endurecimiento antes de producción.

## 19. HTTPS y TLS

- Toda comunicación externa debe usar HTTPS.
- Redirigir o rechazar HTTP en entornos desplegados según la capa de entrada aprobada.
- Usar versiones y cipher suites vigentes administradas por la plataforma.
- Validar certificados y nombres de host; no desactivar validación TLS.
- No permitir contenido mixto en los portales.
- Proteger conexiones desde la API hacia proveedores externos con TLS.
- Gestionar terminación TLS y headers de proxy solo en infraestructura confiable y configurada.
- Aplicar HSTS en producción cuando todo el dominio esté preparado para HTTPS estricto.

## 20. Headers de seguridad

- Definir una Content Security Policy restrictiva y probada.
- Aplicar `X-Content-Type-Options: nosniff`.
- Evitar framing mediante `frame-ancestors` y, cuando se requiera compatibilidad, `X-Frame-Options`.
- Definir `Referrer-Policy` conforme al mínimo dato necesario.
- Restringir capacidades del navegador mediante `Permissions-Policy`.
- Aplicar HSTS únicamente sobre HTTPS y con una estrategia de dominio revisada.
- Configurar cookies con `Secure`, `HttpOnly`, `SameSite`, path y dominio mínimos.
- No exponer headers tecnológicos innecesarios.
- Verificar headers tanto en Next.js como en la API o gateway responsable.

La configuración concreta de headers es una **Implementación futura** y debe validarse contra los flujos reales antes de producción.

## 21. Logging de seguridad

- Registrar autenticaciones fallidas, rechazos de autorización, cambios de permisos y eventos administrativos relevantes.
- Registrar contexto mínimo: timestamp, correlation ID, operación, resultado y sujeto pseudonimizado cuando sea necesario.
- No registrar tokens, secretos, credenciales, cuerpos sensibles ni datos personales innecesarios.
- Evitar log injection mediante logging estructurado y normalización de caracteres de control.
- Proteger acceso, integridad, retención y eliminación de logs.
- Generar alertas sobre patrones anómalos con umbrales revisados.
- Sincronizar timestamps mediante fuentes de tiempo confiables.
- No usar logs como almacenamiento de datos de negocio.

## 22. Auditoría

- Definir qué operaciones requieren trazabilidad inmutable según riesgo y cumplimiento.
- Auditar cambios de permisos, configuración sensible y acciones administrativas.
- Registrar actor, acción, recurso, resultado, tiempo y contexto autorizado.
- Diferenciar auditoría de debugging y telemetría operativa.
- Restringir quién puede consultar o eliminar registros de auditoría.
- Definir retención, integridad y exportación según requisitos empresariales.
- No incluir secretos ni más datos personales de los necesarios.
- Probar que fallos de auditoría no generen silenciosamente operaciones sin trazabilidad cuando esta sea obligatoria.

La estrategia operativa de auditoría es una **Implementación futura** pendiente de requisitos de negocio y cumplimiento.

## 23. Manejo de errores

- Devolver mensajes seguros, consistentes y sin detalles internos.
- No exponer stack traces, rutas, queries, tokens, configuración ni respuestas completas de proveedores.
- Mantener un identificador de correlación para investigación.
- Diferenciar internamente errores de validación, autorización, negocio, dependencia y sistema.
- Traducir errores de proveedores en el adaptador correspondiente.
- No usar errores distintos que permitan enumerar usuarios o recursos sensibles.
- Registrar la causa técnica de forma segura y devolver al cliente únicamente lo necesario.
- Mantener comportamiento fail-closed cuando falle un control de seguridad.

El filtro global actual proporciona una base de respuestas consistentes; la redacción y observabilidad deben revisarse al añadir casos reales.

## 24. Protección de APIs

- Autenticar y autorizar cada operación privada.
- Validar método, content type, tamaño, esquema y semántica de entradas.
- Aplicar rate limiting, cuotas o controles equivalentes según riesgo y consumidor.
- Definir timeouts y límites para dependencias externas.
- Prevenir mass assignment mediante DTOs cerrados y mapeo explícito.
- No exponer endpoints internos, de diagnóstico o documentación sin una decisión consciente por entorno.
- Mantener versionado y compatibilidad de contratos.
- Proteger health checks para que no revelen topología ni configuración.
- Aplicar idempotencia a operaciones que puedan repetirse de forma segura cuando el caso de uso lo requiera.
- Revisar Swagger y documentación de API antes de exponerlos fuera de entornos autorizados.

## 25. Protección de datos sensibles

- Clasificar datos por sensibilidad y propósito antes de almacenarlos o transmitirlos.
- Recopilar y conservar únicamente los datos necesarios.
- Cifrar datos en tránsito y usar capacidades de cifrado en reposo de la plataforma.
- Aplicar controles de acceso por identidad, propósito y recurso.
- Enmascarar o redactar datos en logs, errores, telemetría y entornos no productivos.
- No usar datos productivos reales en desarrollo o pruebas salvo proceso autorizado y protegido.
- Definir retención y eliminación conforme a requisitos empresariales y legales.
- Evitar identificadores sensibles en URLs y caches compartidas.
- Revisar exportaciones, descargas y respuestas masivas por riesgo de exfiltración.

## 26. Seguridad de Dataverse

La integración con Dataverse es una **Implementación futura**.

Cuando se implemente:

- Usar una identidad dedicada y permisos mínimos por tablas y operaciones.
- Mantener endpoints e identidad exclusivamente en configuración server-side.
- No permitir que el cliente construya consultas OData arbitrarias.
- Usar allowlists para campos, filtros, expansiones y ordenamientos.
- Aplicar paginación y límites de resultados.
- Validar y mapear respuestas a modelos internos.
- Respetar roles, ownership y seguridad por fila o campo configurados en Dataverse.
- Controlar concurrencia y actualizaciones mediante mecanismos soportados cuando corresponda.
- Registrar operaciones sensibles sin almacenar payloads completos.
- No asumir que la autorización de la API reemplaza la seguridad propia de Dataverse.

## 27. Seguridad de Business Central

La integración con Business Central es una **Implementación futura**.

Cuando se implemente:

- Usar una aplicación o identidad dedicada con permisos mínimos.
- Restringir tenant, entorno y compañía mediante configuración validada.
- No aceptar esos identificadores directamente del cliente sin autorización y allowlist.
- Encapsular OAuth, endpoints y modelos externos dentro del adaptador server-side.
- Validar filtros, paginación y campos solicitados.
- Proteger operaciones financieras o de escritura con autorización contextual y auditoría.
- Diseñar idempotencia y control de concurrencia para evitar operaciones duplicadas.
- No registrar documentos, importes o datos sensibles completos sin necesidad aprobada.
- Tratar límites, throttling y errores del proveedor sin desactivar controles de seguridad.

## 28. Seguridad de SharePoint

La integración con SharePoint es una **Implementación futura**.

Cuando se implemente:

- Acceder mediante la API y un adaptador server-side autorizado.
- Restringir sitios, bibliotecas, carpetas y operaciones mediante allowlists y mínimo privilegio.
- Validar nombre, extensión, tamaño, MIME y contenido de archivos según el caso de uso.
- Analizar archivos por malware cuando el flujo y la plataforma lo requieran.
- Evitar path traversal, sobrescritura y acceso a documentos de otros usuarios.
- No confiar únicamente en enlaces compartidos como autorización.
- Definir expiración y alcance mínimo para URLs temporales.
- Preservar permisos y clasificación documental.
- Auditar cargas, descargas, cambios de permisos y eliminaciones sensibles.

## 29. Seguridad del frontend

- El frontend se considera un entorno no confiable y observable por el usuario.
- No incluir secretos, credenciales, client secrets ni lógica de autorización definitiva.
- Usar Server Components por defecto y limitar Client Components.
- No almacenar tokens en ubicaciones accesibles a scripts sin evaluar el riesgo de XSS y el modelo de MSAL.
- Validar y escapar contenido externo antes de mostrarlo.
- Aplicar protección XSS, CSRF, clickjacking y headers de seguridad.
- No confiar en ocultar controles visuales; la API debe volver a autorizar.
- Evitar enviar datos sensibles o permisos no necesarios al browser.
- No exponer stack traces, source maps públicos no autorizados ni configuración interna.
- Mantener dependencias de cliente mínimas para reducir superficie de ataque.

La autenticación frontend todavía no está implementada y debe diseñarse antes de añadir flujos protegidos.

## 30. Seguridad del backend

- La API es el límite central de autenticación, autorización, validación y acceso a integraciones.
- Mantener Controllers delgados y controles transversales centralizados.
- Proteger rutas privadas por defecto como arquitectura propuesta.
- Mantener CORS, Swagger y endpoints de diagnóstico restringidos por entorno.
- Configurar límites de payload, timeout, rate limiting y apagado seguro.
- Ejecutar con una identidad sin privilegios y permisos mínimos sobre recursos.
- No persistir estado sensible en memoria local como requisito de corrección.
- Aislar SDK y respuestas de proveedores en adaptadores.
- Aplicar logging estructurado, correlación y redacción.
- No reducir validación HTTP global, filtros o guards para facilitar pruebas o integraciones.

## 31. Dependencias y vulnerabilidades

- Añadir dependencias únicamente cuando exista una necesidad demostrada.
- Evaluar mantenedor, procedencia, licencia, popularidad, tamaño y postura de seguridad.
- No depender accidentalmente de paquetes transitivos.
- Mantener lockfile y versiones reproducibles.
- Revisar avisos de seguridad y priorizar remediación según exposición y severidad.
- No aplicar actualizaciones masivas sin evaluar compatibilidad y alcance.
- Eliminar dependencias y código sin uso.
- Proteger pipelines contra instalación o ejecución de paquetes no confiables.
- Revisar scripts de instalación y paquetes con acceso a secretos o red.
- Documentar excepciones temporales con propietario, mitigación y fecha de expiración.

## 32. Gestión de incidentes

- Definir canales, responsables y niveles de severidad antes de un incidente.
- Preservar evidencia y evitar acciones que destruyan trazabilidad.
- Contener primero el impacto sin ocultar el incidente.
- Rotar o revocar credenciales comprometidas mediante personal autorizado.
- Identificar alcance, causa raíz, datos afectados y línea temporal.
- Comunicar según las políticas empresariales, contractuales y legales aplicables.
- Recuperar mediante procedimientos verificados y monitorear recurrencia.
- Documentar acciones correctivas y preventivas.
- No incluir información sensible del incidente en canales o repositorios no autorizados.
- Los agentes de IA no deben ejecutar acciones de contención destructivas ni cambios de infraestructura sin autorización.

La coordinación operativa detallada es una **Implementación futura** que requiere propietarios y procesos empresariales definidos.

## 33. Revisión periódica de seguridad

- Revisar permisos, identidades, secretos y accesos de forma periódica.
- Revisar dependencias, vulnerabilidades y actualizaciones relevantes.
- Revisar CORS, headers, endpoints públicos y documentación expuesta.
- Revisar logs, alertas y eventos de auditoría.
- Ejecutar threat modeling al introducir integraciones o flujos sensibles.
- Revisar pruebas de autenticación, autorización y validación.
- Verificar que la documentación coincida con la implementación real.
- Revisar excepciones y eliminar las expiradas.
- Registrar hallazgos, riesgo, propietario y fecha objetivo.
- La frecuencia concreta debe definirse según riesgo, cumplimiento y operación.

## 34. Reglas específicas para agentes de IA

- Leer `.ai/AGENTS.md` y los documentos aplicables antes de actuar.
- No crear, leer, mostrar, copiar, modificar ni rotar secretos.
- No inspeccionar archivos de entorno reales salvo autorización explícita y necesidad justificada.
- No cambiar Azure, Key Vault, tenants, credenciales, permisos o infraestructura sin autorización específica.
- No desactivar controles de seguridad, lint, tipos o pruebas para completar una tarea.
- No inventar políticas, permisos, endpoints, variables o integraciones inexistentes.
- Distinguir claramente arquitectura vigente, arquitectura propuesta, implementación actual e implementación futura.
- Mantener cambios mínimos y no ampliar el alcance.
- Revisar el diff para detectar secretos, datos sensibles y archivos accidentales.
- No ejecutar comandos destructivos ni eliminar datos sin autorización explícita.
- Reportar validaciones no ejecutadas, riesgos e incertidumbres con precisión.
- No hacer commit, push o despliegue sin autorización explícita.

## 35. Cumplimiento y excepciones

Antes de finalizar un cambio con impacto de seguridad, se debe confirmar:

1. Identidad, autorización y mínimo privilegio fueron considerados.
2. Entradas y respuestas externas están validadas.
3. Secretos y datos sensibles no se exponen.
4. Errores, logs y auditoría mantienen información segura y útil.
5. Dependencias y límites de red son apropiados.
6. Las pruebas aplicables cubren casos de abuso relevantes.
7. El diff no debilita controles existentes.

Toda excepción debe incluir riesgo, justificación, mitigación, propietario y fecha de revisión. Una excepción no puede aprobarse implícitamente mediante código, configuración o una omisión documental.
