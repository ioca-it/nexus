# Estándar oficial de módulos de configuración de NEXUS

## 1. Objetivo del estándar

Este documento define la estructura, responsabilidades, límites y validaciones obligatorias para todos los módulos de configuración de NEXUS.

El módulo Auth existente en `libs/config/src/auth` es la referencia canónica de este estándar. Cada nuevo módulo debe conservar sus propiedades esenciales:

- Contrato pequeño y explícito.
- Validación limitada a las variables del propio módulo.
- Lectura de entorno inyectable para pruebas.
- Loader responsable de construir el contrato.
- Servicio con caché local e inmutable durante la vida del proceso.
- Punto de entrada público mínimo.
- Pruebas aisladas de variables pertenecientes a otros módulos.

Este estándar no autoriza la creación de módulos sin un consumidor real ni sustituye la aprobación arquitectónica requerida para cambios de límites públicos.

## 2. Estructura obligatoria de un módulo

Un módulo server-side debe seguir esta estructura:

```text
libs/config/src/<module>/
|-- <module>-config.types.ts
|-- <module>-config.validator.ts
|-- <module>-config.loader.ts
|-- <module>-config.service.ts
|-- <module>-config.spec.ts
`-- index.ts
```

Solo se pueden agregar archivos adicionales cuando exista una responsabilidad demostrable que no corresponda a los seis archivos anteriores.

Las utilidades genuinamente reutilizables deben residir en una frontera explícita:

```text
libs/config/src/server/
|-- configuration-error.ts
`-- environment-reader.ts

libs/config/src/shared/
`-- environment-variables.ts
```

No se deben crear carpetas, loaders, contratos o barrels para capacidades futuras sin consumidores aprobados.

## 3. Responsabilidad de cada archivo

### 3.1 `<module>-config.types.ts`

Debe:

- Declarar el contrato de configuración del módulo.
- Contener únicamente propiedades utilizadas por consumidores reales del módulo.
- Usar tipos estrictos y nombres del dominio.
- Mantenerse independiente de `process.env`, frameworks y SDK externos.

No debe:

- Leer variables de entorno.
- Aplicar validaciones.
- Contener secretos de ejemplo o valores predeterminados.
- Agregar propiedades de otros módulos.
- Exponer el modelo de configuración global legacy.

La interfaz pública debe seguir el patrón `<Module>Config`.

### 3.2 `<module>-config.validator.ts`

Debe:

- Leer exclusivamente las variables requeridas por el módulo.
- Recibir un contrato `EnvironmentVariables`, con `process.env` como fuente predeterminada solo en server-side.
- Usar el lector centralizado de entorno para normalizar valores.
- Considerar ausentes los valores inexistentes, vacíos o compuestos únicamente por espacios.
- Acumular las variables obligatorias ausentes antes de lanzar el error.
- Retornar valores validados y correctamente estrechados para el loader.

No debe:

- Construir el contrato público final si se requiere un mapeo de nombres.
- Validar variables pertenecientes a otro módulo.
- Ejecutar llamadas de red, leer archivos ni acceder a servicios externos.
- Aplicar reglas de negocio ajenas a configuración.

### 3.3 `<module>-config.loader.ts`

Debe:

- Invocar el validador del mismo módulo.
- Transformar los valores validados al contrato `<Module>Config`.
- Mantener el mapeo entre nombres de variables de entorno y nombres del dominio.
- Aceptar una fuente `EnvironmentVariables` inyectable, usando `process.env` únicamente como valor predeterminado server-side.
- Ser determinista para una misma fuente de entorno.

No debe:

- Mantener caché.
- Validar variables de otros módulos.
- Delegar en `getAppConfig()` ni en otro agregador global.
- Ejecutar efectos secundarios externos.

### 3.4 `<module>-config.service.ts`

Debe:

- Encapsular la caché del módulo.
- Recibir el loader como dependencia en su fábrica para permitir pruebas aisladas.
- Exponer internamente una fábrica con el patrón `create<Module>ConfigService`.
- Exponer públicamente un getter con el patrón `get<Module>Config`.
- Cargar la configuración solo en el primer acceso satisfactorio.
- Retornar la misma instancia durante la vida del servicio.

No debe:

- Compartir caché con otros módulos.
- Mutar el contrato después de cargarlo.
- ocultar un error del loader ni almacenar como válida una carga fallida.
- Proporcionar métodos genéricos para consultar variables arbitrarias.

### 3.5 `index.ts`

Debe ser el único punto de entrada público del módulo y exportar únicamente:

- El tipo `<Module>Config`.
- El getter `get<Module>Config`.

No debe exportar:

- El loader.
- El validador.
- La fábrica interna del servicio.
- El lector de entorno.
- `ConfigurationError` como atajo del módulo.
- Funciones o tipos de otros módulos.

### 3.6 `<module>-config.spec.ts`

Debe verificar como mínimo el contrato, la normalización, la validación exclusiva, los errores y la política de caché definidos en este documento.

Las pruebas deben usar valores ficticios, una fuente `EnvironmentVariables` controlada y loaders inyectados. No deben depender de variables reales del equipo, red, Azure ni servicios externos.

## 4. Flujo de inicialización

El flujo server-side obligatorio es:

```text
Consumidor
    |
    v
get<Module>Config()
    |
    v
Servicio del modulo
    |
    +-- cache existente --> retorna contrato cacheado
    |
    `-- sin cache
            |
            v
      load<Module>Config()
            |
            v
      validate<Module>Environment()
            |
            v
      environment-reader
            |
            v
      EnvironmentVariables / process.env
```

El consumidor nunca debe invocar directamente el loader o el validador de otro proyecto. La inicialización debe ser perezosa: un módulo valida su configuración cuando un consumidor solicita ese módulo, no cuando se importa la librería completa.

## 5. Flujo de validación

La validación debe seguir este orden:

1. Recibir la fuente de variables.
2. Leer únicamente las claves propiedad del módulo.
3. Eliminar espacios externos mediante el lector compartido.
4. Identificar todos los valores obligatorios ausentes.
5. Lanzar un único `ConfigurationError` cuando existan ausencias.
6. Retornar un resultado estrechado, sin `undefined` en campos obligatorios.
7. Permitir que el loader construya el contrato público.

La ausencia de variables de módulos no utilizados nunca debe provocar un error. Los valores opcionales solo pueden tener un valor predeterminado cuando su semántica esté documentada y probada.

## 6. Política de caché

- La caché pertenece exclusivamente al servicio de cada módulo.
- Debe existir una instancia de configuración por instancia del servicio durante la vida del proceso o runtime correspondiente.
- La primera carga satisfactoria queda cacheada.
- Una carga fallida no debe quedar cacheada; un acceso posterior debe poder reintentar la carga.
- El getter público no acepta parámetros ni permite sustituir la fuente de entorno.
- La inyección de loaders se reserva a la fábrica interna y a las pruebas.
- No se permite invalidación dinámica, recarga periódica ni mutación sin una decisión arquitectónica específica.
- Dos módulos no pueden depender de una caché global compartida.

Esta política asume que la configuración es estable durante la vida del proceso. Un requisito de configuración dinámica debe tratarse como una capacidad distinta y no como una extensión implícita del patrón.

## 7. Política de errores

- Las variables obligatorias ausentes deben producir `ConfigurationError`.
- El error debe enumerar todas las claves ausentes del módulo en un orden estable.
- El mensaje puede incluir nombres de variables, pero nunca sus valores.
- No se deben registrar secretos, tokens, connection strings ni credenciales.
- El validador no debe capturar el error para sustituirlo por un resultado parcial.
- El loader y el servicio deben propagar el error sin ocultar su causa.
- Los errores no deben revelar la configuración de otros módulos.
- Los consumidores pueden traducir el error en su frontera de aplicación, pero no deben convertir una configuración inválida en un inicio aparentemente correcto.

Si un módulo necesita validaciones de formato adicionales, estas deben ser explícitas, deterministas, seguras y cubiertas por pruebas. Nunca deben incluir el valor inválido sensible en el mensaje.

## 8. Convenciones de nombres

Para un identificador abstracto `<module>`:

| Elemento | Convención |
|---|---|
| Directorio | `<module>` en `kebab-case` |
| Tipo público | `<Module>Config` |
| Validador | `validate<Module>Environment` |
| Loader | `load<Module>Config` |
| Fábrica del servicio | `create<Module>ConfigService` |
| Getter público | `get<Module>Config` |
| Prueba | `<module>-config.spec.ts` |
| Subpath Nx | `@nexus/config/<module>` |
| Variables de entorno | `UPPER_SNAKE_CASE` |

Los nombres del contrato deben expresar su significado para el consumidor. No deben copiar automáticamente el nombre técnico de la variable cuando exista un nombre de dominio más preciso.

## 9. Reglas para variables de entorno

- Cada variable debe tener un único módulo propietario.
- Un módulo solo puede leer las variables que utiliza directamente.
- Las variables existentes deben conservar su nombre durante una migración compatible, salvo decisión y plan de transición aprobados.
- Toda lectura server-side debe pasar por `environment-reader`.
- Los espacios externos deben eliminarse de forma consistente.
- Una cadena vacía después de normalizar equivale a una variable ausente.
- Las variables obligatorias y opcionales deben distinguirse explícitamente.
- Los valores predeterminados deben estar documentados y probados.
- Los nombres pueden aparecer en errores; los valores no.
- Las pruebas deben proporcionar un objeto controlado y no modificar archivos `.env` reales.
- Ningún módulo debe recorrer o devolver `process.env` completo.
- Una variable sin consumidor real no debe hacerse obligatoria preventivamente.

## 10. Qué puede importar un módulo

Un módulo server-side puede importar:

- Sus propios tipos, validador, loader y servicio mediante rutas relativas internas.
- `EnvironmentVariables` desde `shared/environment-variables`.
- `readEnvironmentVariable` desde `server/environment-reader`.
- `ConfigurationError` desde `server/configuration-error`.
- Tipos estándar de TypeScript necesarios para expresar su contrato.

Las pruebas pueden importar detalles internos del mismo módulo para validar cada responsabilidad de forma aislada.

## 11. Qué NO puede importar

Un módulo no puede importar:

- `getAppConfig()`, `loadAppConfig()` o `NexusConfig`.
- Loaders, validadores, servicios o tipos de configuración de otro dominio.
- El barrel global `libs/config/src/index.ts` desde dentro de la propia librería.
- Código de `api`, `admin-portal`, `customer-portal` ni otra aplicación.
- NestJS, Next.js, React o Passport para resolver configuración.
- SDK de Azure, bases de datos, clientes HTTP o adaptadores empresariales.
- Archivos `.env`, secretos o credenciales versionadas.
- Rutas internas server-side desde código destinado al navegador.

Una necesidad de importar otro módulo de configuración indica que el contrato está mezclando responsabilidades y debe revisarse antes de continuar.

## 12. Reglas Browser vs Server

### Server

- Puede acceder a `process.env` exclusivamente mediante el lector server-side.
- Puede manejar configuración sensible, pero solo debe devolverla al consumidor server-side autorizado.
- Debe usar un subpath que no pueda confundirse con una API de navegador.
- No debe ser importado desde Client Components ni código incluido en bundles browser.

### Browser

- No puede importar `server/environment-reader`, `ConfigurationError` server-side ni módulos server-side.
- No puede acceder dinámicamente a `process.env` ni aceptar nombres arbitrarios de variables.
- Solo puede exponer una allowlist explícita de valores aprobados como públicos.
- No puede contener secretos, credenciales, tokens privilegiados ni connection strings.
- Debe usar un punto de entrada bajo `@nexus/config/browser/...`.
- Su contrato, loader, validación y caché deben permanecer separados de los módulos server-side.

Compartir un tipo entre browser y server solo está permitido cuando el tipo es neutral, no contiene datos sensibles y reside en `shared`.

## 13. Reglas para exports públicos

- Cada módulo debe tener un único `index.ts` público.
- La superficie pública normal se limita al contrato y al getter.
- Los consumidores deben usar el subpath Nx; nunca rutas relativas hacia `libs/config/src`.
- El barrel global no debe reexportar módulos server-side nuevos.
- No se permiten exports wildcard en puntos de entrada de configuración.
- Agregar o retirar un export público requiere revisar consumidores y compatibilidad.
- Un símbolo interno solo puede hacerse público cuando exista un consumidor externo demostrado.
- Los tipos deben exportarse mediante `export type` cuando corresponda.

## 14. Reglas para subpaths Nx

- Cada módulo server-side debe declarar un alias exacto con el patrón `@nexus/config/<module>`.
- Cada módulo browser debe declarar un alias exacto bajo `@nexus/config/browser/<module>`.
- El alias debe apuntar al `index.ts` del módulo, nunca a un loader, validador o servicio interno.
- No se debe introducir un wildcard `@nexus/config/*` que permita evadir la API pública.
- Los aliases TypeScript y los exports de paquete deben mantenerse coherentes cuando la librería se distribuya como paquete.
- La aplicación consumidora debe importar solo el subpath aprobado.
- El build y las pruebas del módulo y de sus consumidores deben resolver el mismo subpath.
- Los límites Nx o ESLint deben impedir imports browser hacia subpaths server-side cuando esa automatización esté disponible.

## 15. Cobertura mínima de pruebas

Cada módulo debe incluir pruebas que demuestren:

1. Carga satisfactoria con todas sus variables obligatorias.
2. Eliminación de espacios externos.
3. Construcción exacta del contrato público.
4. Ausencia de dependencia sobre variables de otros módulos.
5. Error cuando falta cada variable obligatoria de forma individual.
6. Error agregado y orden estable cuando faltan varias variables.
7. Tratamiento de cadenas vacías como ausentes.
8. Aplicación de valores predeterminados, cuando existan.
9. Una sola ejecución del loader después de una carga satisfactoria.
10. Retorno de la misma instancia cacheada.
11. Ausencia de caché después de una carga fallida.
12. Restauración de cualquier estado de entorno alterado por la prueba.

Los tests no deben usar secretos reales, llamadas de red ni depender del orden de otras suites.

## 16. Checklist antes de crear un nuevo módulo

- [ ] Existe un consumidor real, identificado y autorizado.
- [ ] La responsabilidad no pertenece a un módulo existente.
- [ ] Se conocen todas las variables realmente utilizadas.
- [ ] Cada variable tiene propietario único.
- [ ] Se ha definido cuáles son obligatorias y cuáles opcionales.
- [ ] Los valores predeterminados tienen semántica documentada.
- [ ] El contrato contiene únicamente campos requeridos por el consumidor.
- [ ] Se ha determinado si el módulo es browser o server.
- [ ] No se exponen secretos a browser.
- [ ] La estructura sigue los seis archivos obligatorios.
- [ ] El módulo no depende de configuración global ni de otros dominios.
- [ ] El subpath público exacto está definido.
- [ ] El `index.ts` exportará solamente el tipo y el getter.
- [ ] La estrategia de compatibilidad está documentada si existe un consumidor legacy.
- [ ] Las pruebas mínimas están diseñadas antes de integrar el consumidor.
- [ ] El cambio no crea loaders o adaptadores para funcionalidades futuras.
- [ ] Existe aprobación arquitectónica cuando el cambio altera límites públicos.

## 17. Checklist antes de eliminar código legacy

- [ ] Todos los consumidores legacy han sido inventariados.
- [ ] Cada consumidor fue migrado a un subpath modular aprobado.
- [ ] No existen imports de `getAppConfig()`, `loadAppConfig()` o `NexusConfig` en código activo.
- [ ] No existen imports profundos hacia loaders, validadores o servicios legacy.
- [ ] Las variables siguen siendo compatibles o existe un plan de transición aprobado.
- [ ] Los módulos nuevos validan únicamente sus propias variables.
- [ ] La aplicación puede iniciar sin configuración de módulos no utilizados.
- [ ] Los tests unitarios de cada módulo son satisfactorios.
- [ ] Los tests de consumidores relacionados son satisfactorios.
- [ ] Lint y build de `config` son satisfactorios.
- [ ] Lint, tests y build de los consumidores afectados son satisfactorios.
- [ ] El grafo o las búsquedas de imports confirman que no quedan dependencias legacy.
- [ ] El plan de reversión está definido.
- [ ] La eliminación no borra secretos, datos ni configuración operativa real.
- [ ] La documentación refleja el estado implementado.
- [ ] El ADR aplicable está aceptado y sus criterios de retiro están cumplidos.
- [ ] Existe autorización explícita para eliminar el código.

## 18. Ejemplo abstracto

El siguiente ejemplo describe un módulo hipotético llamado `<feature>` sin representar ninguna integración real:

```text
libs/config/src/<feature>/
|-- <feature>-config.types.ts       Contrato <Feature>Config
|-- <feature>-config.validator.ts   Lee y valida solo FEATURE_*
|-- <feature>-config.loader.ts      Construye <Feature>Config
|-- <feature>-config.service.ts     Cachea la primera carga valida
|-- <feature>-config.spec.ts        Prueba contrato, aislamiento y cache
`-- index.ts                        Exporta tipo y get<Feature>Config
```

Flujo conceptual:

```text
Consumidor server-side
    |
    v
@nexus/config/<feature>
    |
    v
get<Feature>Config
    |
    v
cache local --sin valor--> loader --> validator --> environment-reader
    |
    `--con valor---------> contrato <Feature>Config
```

El ejemplo no define variables concretas, secretos, adaptadores ni comportamiento funcional. La lista real de campos y variables solo puede establecerse a partir de un consumidor aprobado y verificable.
