# Estándares de código de NEXUS

## 1. Propósito y alcance

Este documento establece las reglas oficiales de implementación y revisión de código para NEXUS. Aplica a todas las aplicaciones, librerías, pruebas y herramientas del Nx Monorepo.

Estas reglas complementan `.ai/AGENTS.md`, `.ai/architecture.md` y `.ai/security.md`. Ante una excepción necesaria, se debe documentar la justificación en el cambio y, si afecta la arquitectura de forma duradera, registrar un ADR.

Principios rectores:

- Corrección antes que conveniencia.
- Seguridad antes que velocidad de entrega.
- Código claro antes que código ingenioso.
- Cambios pequeños antes que refactorizaciones amplias.
- Consistencia con el repositorio antes que preferencias personales.

## 2. Convenciones generales de TypeScript

- Mantener `strict` habilitado donde ya exista y no debilitarlo.
- Todo código nuevo debe ser compatible con tipado estricto.
- Evitar `any`; usar `unknown` y realizar narrowing explícito.
- No usar `@ts-ignore`, casts dobles ni aserciones inseguras para ocultar errores.
- Preferir inferencia cuando el tipo sea evidente y tipos explícitos en límites públicos.
- Declarar tipos de retorno en APIs públicas, servicios y funciones con lógica no trivial.
- Preferir `const`; usar `let` únicamente cuando exista reasignación real.
- Evitar enums cuando una unión literal o un objeto `as const` sea suficiente.
- Usar optional chaining y nullish coalescing cuando expresen correctamente la intención.
- Diferenciar `null`, `undefined` y ausencia de propiedad mediante contratos explícitos.
- No introducir estado global mutable.
- Mantener funciones pequeñas, cohesivas y con un único nivel de abstracción predominante.

## 3. Convenciones de NestJS

- Organizar el backend por módulos cohesivos y capacidades de negocio.
- Mantener Controllers delgados: reciben entradas, delegan casos de uso y construyen respuestas.
- No colocar lógica de negocio, acceso a datos ni llamadas a proveedores en Controllers.
- Mantener Services con responsabilidades concretas; evitar servicios que concentren múltiples dominios.
- Usar inyección de dependencias y tokens explícitos para puertos y adaptadores.
- Usar Guards para autenticación y autorización.
- Usar Pipes para validación y transformación de entradas de transporte.
- Usar Interceptors para preocupaciones transversales como correlación, métricas o logging.
- Usar Exception Filters para traducir errores a respuestas HTTP consistentes.
- No lanzar excepciones HTTP desde el dominio.
- No usar módulos globales salvo necesidad transversal demostrada.
- Evitar dependencias circulares y no normalizar el uso de `forwardRef`.
- Exportar desde un módulo únicamente los proveedores que otros módulos necesiten.
- Mantener configuración y secretos fuera de decoradores, Controllers y lógica de dominio.

## 4. Convenciones de Next.js App Router

- Usar Server Components por defecto.
- Añadir `"use client"` únicamente cuando sean necesarias APIs del navegador, estado, efectos o interacción del usuario.
- Mantener el límite de Client Components lo más profundo y pequeño posible.
- No importar módulos server-only desde componentes de cliente.
- No exponer variables sin el prefijo público previsto por Next.js.
- Mantener secretos, tokens privilegiados y acceso a servicios empresariales en el servidor.
- Usar `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx` y `not-found.tsx` según las convenciones del App Router.
- Mantener Route Handlers delgados y sin lógica de negocio duplicada.
- Evitar convertir Route Handlers en proxies innecesarios de la API NEXUS.
- Definir conscientemente las políticas de caché y revalidación; no depender de valores implícitos cuando afecten la corrección.
- Validar parámetros, headers y cuerpos en todos los límites server-side.

## 5. Convenciones de React

- Escribir componentes funcionales y cohesivos.
- No colocar lógica de negocio en React Components.
- Mantener el estado lo más local posible.
- No duplicar estado que pueda derivarse de props o datos existentes.
- Evitar efectos para cálculos que puedan resolverse durante el renderizado.
- Mantener dependencias de hooks completas y correctas.
- No usar índices de arreglos como `key` cuando exista un identificador estable.
- Evitar prop drilling amplio; preferir composición y Context solo para estado realmente transversal.
- Separar lógica reutilizable de interacción en hooks con una responsabilidad clara.
- No aplicar memoización sin evidencia de un problema de rendimiento.
- Mantener componentes compartidos libres de reglas exclusivas de un portal.

## 6. Convenciones de Nx

- Las aplicaciones son composition roots; la lógica reutilizable debe residir en librerías apropiadas.
- Una aplicación no puede depender de otra aplicación.
- Consumir cada librería mediante su punto de entrada público.
- No usar imports relativos que atraviesen límites de proyectos.
- Respetar los tags y restricciones de dependencias cuando estén configurados.
- No crear una librería sin una responsabilidad y consumidores potenciales claramente identificados.
- Preferir targets específicos o `affected` para validaciones.
- Mantener los targets y generadores consistentes con la configuración central de Nx.
- No editar manualmente artefactos generados en `dist`, `.next`, `coverage` o cachés de Nx.

## 7. Organización de carpetas

- Organizar código por capacidad o dominio antes que por tipo técnico global.
- Mantener juntos el código y sus pruebas unitarias cuando la convención del proyecto lo permita.
- Evitar carpetas genéricas como `misc`, `common` o `helpers` sin una responsabilidad delimitada.
- Usar `shared` solo para código genuinamente compartido y estable.
- Mantener adaptadores externos separados por proveedor.
- Mantener contratos públicos en ubicaciones explícitas y no junto a implementaciones privadas.
- Evitar archivos índice profundos que oculten ciclos o amplíen APIs públicas accidentalmente.

Estructura orientativa por capacidad, cuando exista una necesidad real:

```text
<capacidad>/
|-- application/
|-- domain/
|-- infrastructure/
|-- presentation/
`-- index.ts
```

No se deben crear carpetas vacías anticipando funcionalidades futuras.

## 8. Convenciones de nombres

- Usar `kebab-case` para nombres de archivos y directorios, salvo archivos especiales de frameworks.
- Usar `PascalCase` para clases, componentes, interfaces y tipos.
- Usar `camelCase` para variables, funciones, métodos y propiedades.
- Usar `UPPER_SNAKE_CASE` para constantes globales inmutables y claves estáticas.
- Nombrar booleanos con prefijos como `is`, `has`, `can` o `should`.
- Nombrar funciones mediante verbos que expresen su efecto.
- Evitar abreviaturas ambiguas y nombres genéricos como `data`, `item`, `manager` o `utils` sin contexto.
- Usar nombres del dominio de manera consistente entre capas.
- Respetar nombres de archivos requeridos por Next.js y convenciones de NestJS como `.controller.ts`, `.service.ts`, `.module.ts`, `.guard.ts` y `.strategy.ts`.

## 9. Interfaces, tipos y DTOs

- Usar interfaces para contratos extensibles de objetos y tipos para uniones, composiciones y aliases.
- Evitar prefijos como `I` o `T` salvo una convención externa obligatoria.
- Mantener DTOs de transporte separados de entidades y modelos de dominio.
- Validar DTOs en tiempo de ejecución; el tipado TypeScript no sustituye la validación.
- No exportar directamente modelos de SDK externos como contratos internos.
- Mantener contratos compartidos neutrales respecto a NestJS y Next.js cuando deban consumirse en varias plataformas.
- No incluir secretos o campos internos en DTOs de respuesta.
- Versionar o evolucionar de forma compatible los contratos públicos.
- Evitar tipos excesivamente amplios y propiedades opcionales sin semántica definida.

## 10. Manejo de errores

- Tratar los errores como parte explícita del contrato de una operación.
- Crear errores específicos cuando permitan decisiones claras de aplicación o presentación.
- Traducir errores externos en el límite de infraestructura.
- No propagar respuestas, códigos o modelos de un proveedor hacia el dominio.
- No capturar errores para ignorarlos.
- Añadir contexto útil al propagar un error sin duplicar ni revelar información sensible.
- Mantener respuestas HTTP consistentes mediante filtros globales o mapeadores centralizados.
- No devolver stack traces, secretos ni detalles internos al cliente.
- Distinguir errores esperados de negocio, errores de validación y fallos técnicos.

## 11. Logging

- Usar el logger de la plataforma o la abstracción oficial; no usar `console.log` en código productivo.
- Generar logs estructurados con nombres de campos consistentes.
- Incluir contexto operativo útil: correlación, operación, duración y resultado.
- No registrar tokens, secretos, credenciales, connection strings ni payloads sensibles.
- Evitar duplicar el mismo error en múltiples capas sin aportar contexto adicional.
- Usar niveles de log coherentes con la severidad.
- Mantener mensajes accionables y evitar ruido en rutas de alta frecuencia.
- La telemetría no debe modificar el resultado funcional de una operación.

## 12. Validación de datos

- Validar toda entrada externa en el límite donde ingresa al sistema.
- En NestJS, usar DTOs y Pipes compatibles con la validación global existente.
- Rechazar propiedades no permitidas cuando el contrato lo requiera.
- Validar parámetros de ruta, query strings, headers y cuerpos.
- Validar respuestas de Dataverse, Business Central, SharePoint y otros proveedores antes de tratarlas como modelos internos.
- Normalizar datos solo después de validarlos.
- Mantener reglas de negocio en dominio o aplicación, no mezclarlas con validación puramente estructural.
- Definir límites de longitud, tamaño, rango y formato cuando sean relevantes.

## 13. Async/Await

- Preferir `async`/`await` sobre cadenas extensas de promesas.
- Esperar o devolver explícitamente toda promesa; evitar promesas flotantes.
- Ejecutar en paralelo únicamente operaciones independientes.
- No usar `Promise.all` cuando un fallo parcial requiera tratamiento individual.
- Manejar cancelación, timeout y errores en llamadas de red.
- Evitar `async` cuando la función no realiza ni devuelve trabajo asíncrono.
- No bloquear el event loop con operaciones intensivas o síncronas en rutas críticas.
- Preservar el error original mediante `cause` cuando se añada contexto y la plataforma lo permita.

## 14. Imports

- Ordenar imports según la configuración automática del repositorio cuando exista.
- Separar imports de tipos mediante `import type` cuando corresponda.
- Consumir librerías Nx mediante aliases y puntos de entrada públicos.
- Usar imports relativos únicamente dentro del mismo proyecto y sin atravesar sus límites.
- Evitar imports profundos de paquetes externos salvo APIs documentadas.
- Eliminar imports no utilizados.
- Evitar barrels que creen ciclos, oculten dependencias o exporten implementaciones privadas.
- No importar módulos server-only desde código browser.

## 15. Comentarios de código

- Escribir comentarios para explicar el porqué, una restricción o una decisión no evidente.
- No describir literalmente lo que el código ya expresa.
- Mantener comentarios actualizados al modificar el comportamiento relacionado.
- Eliminar comentarios obsoletos, código comentado y marcadores generados sin utilidad.
- Usar `TODO` únicamente con contexto suficiente y, cuando exista, una referencia rastreable.
- No incluir secretos, datos personales ni instrucciones operativas sensibles en comentarios.

## 16. Documentación

- Documentar APIs públicas, contratos, configuración y procedimientos que un consumidor necesite conocer.
- Actualizar la documentación en el mismo cambio que altera su comportamiento.
- Registrar decisiones arquitectónicas duraderas en `.ai/adr/`.
- Distinguir claramente arquitectura vigente, arquitectura propuesta, implementación actual e implementación futura.
- Mantener ejemplos mínimos, correctos y sin valores sensibles.
- No crear documentación duplicada; enlazar la fuente oficial.
- Usar nombres y términos coherentes con `.ai/architecture.md`.

## 17. Principio DRY

- No duplicar lógica de negocio, validaciones, contratos o configuración.
- Extraer una abstracción solo cuando exista una responsabilidad común estable.
- No forzar la reutilización entre conceptos que solo tienen una forma similar.
- Mantener una única fuente de verdad para constantes y políticas compartidas.
- Preferir duplicación temporal pequeña frente a una abstracción incorrecta difícil de revertir.

## 18. Principio KISS

- Elegir la solución más simple que cumpla los requisitos y preserve la arquitectura.
- Favorecer flujos explícitos sobre comportamiento implícito difícil de rastrear.
- Evitar patrones, capas y configuraciones que no aporten valor verificable.
- Mantener APIs pequeñas y nombres directos.
- Dividir lógica compleja en unidades cohesivas sin fragmentarla artificialmente.

## 19. Principio YAGNI

- No implementar capacidades, configuraciones o extensiones no solicitadas.
- No crear librerías, interfaces o flags para escenarios hipotéticos.
- No añadir dependencias por una posible necesidad futura.
- Implementar extensibilidad cuando exista un segundo caso real o un requisito confirmado.
- Registrar ideas futuras en el roadmap, no como código inactivo.

## 20. Optimización y rendimiento

- Medir antes de optimizar.
- Corregir primero algoritmos, consultas o flujos redundantes.
- Evitar consultas duplicadas y llamadas externas repetidas.
- Evitar renders innecesarios y JavaScript de cliente no requerido.
- Preferir Server Components cuando no se necesite interactividad.
- Aplicar paginación, selección de campos y límites en integraciones.
- No introducir caché sin definir invalidez, consistencia y observabilidad.
- No aplicar memoización indiscriminada.
- Evitar dependencias pesadas para resolver problemas pequeños.
- Eliminar código muerto en el alcance directo del cambio cuando sea seguro hacerlo.

## 21. Accesibilidad

- Usar HTML semántico antes que roles ARIA personalizados.
- Mantener navegación completa mediante teclado.
- Proporcionar nombres accesibles para controles, iconos e imágenes funcionales.
- Asociar labels y mensajes de error con sus campos.
- Mantener foco visible y gestionarlo en cambios de contexto relevantes.
- No comunicar información únicamente mediante color.
- Mantener contraste y tamaños legibles según los estándares aplicables al proyecto.
- Respetar preferencias de movimiento reducido cuando existan animaciones.
- Incluir accesibilidad en pruebas de componentes y E2E cuando el flujo lo requiera.

## 22. Revisión de código

Toda revisión debe comprobar:

- Correspondencia entre el cambio y el alcance solicitado.
- Respeto de límites arquitectónicos y dirección de dependencias.
- Corrección funcional, seguridad y manejo de errores.
- Ausencia de secretos, datos sensibles y archivos generados accidentales.
- Calidad de tipos y validación en tiempo de ejecución.
- Cobertura de pruebas proporcional al riesgo.
- Compatibilidad hacia atrás y efectos sobre consumidores.
- Rendimiento en rutas críticas y llamadas externas.
- Accesibilidad en cambios de interfaz.
- Documentación y ADR cuando correspondan.
- Diff limitado, legible y sin refactorizaciones no relacionadas.

## 23. Buenas prácticas de Git

- Mantener cambios y commits pequeños, atómicos y con un único propósito.
- No mezclar formateo o refactorización no relacionada con cambios funcionales.
- Revisar el diff y el estado del repositorio antes de entregar o confirmar cambios.
- No versionar secretos, archivos de entorno reales, artefactos de build, cachés ni dependencias instaladas.
- No reescribir historia compartida ni realizar force push sin autorización y coordinación explícitas.
- No eliminar ni sobrescribir cambios de otra persona.
- Usar mensajes de commit claros que describan intención y alcance cuando se autorice crear commits.
- Los agentes de IA no deben hacer commit ni push sin autorización explícita.

## 24. Reglas para pruebas

- Añadir o actualizar pruebas cuando cambie comportamiento observable.
- Probar reglas de dominio con pruebas unitarias independientes de frameworks.
- Probar casos de uso mediante sus puertos, sin requerir proveedores reales.
- Probar adaptadores con pruebas de integración y contratos controlados.
- Usar E2E para flujos críticos y límites desplegables, no para cubrir todas las combinaciones.
- Mantener pruebas deterministas, aisladas y repetibles.
- Evitar dependencias de tiempo, orden, red o datos compartidos sin control explícito.
- No incluir credenciales reales ni acceder a servicios productivos desde pruebas.
- Usar nombres que describan escenario, acción y resultado esperado.
- Comprobar resultados y efectos relevantes; evitar assertions triviales.
- No reducir cobertura ni eliminar pruebas para ocultar una regresión.
- Ejecutar los tests del proyecto afectado y de consumidores relacionados cuando corresponda.

## 25. Reglas para dependencias

- Añadir una dependencia solo cuando exista una necesidad demostrada.
- Verificar que la plataforma o una dependencia existente no resuelvan ya el problema.
- Evaluar mantenimiento, seguridad, licencia, tamaño y compatibilidad antes de incorporarla.
- Preferir paquetes con APIs pequeñas, estables y activamente mantenidas.
- Declarar la dependencia en el nivel propietario correcto.
- No depender accidentalmente de paquetes transitivos.
- Evitar dependencias server-only en bundles de browser.
- No actualizar versiones fuera del alcance solicitado.
- Mantener el lockfile sincronizado únicamente cuando una modificación de dependencias esté autorizada.
- Documentar dependencias estratégicas o difíciles de reemplazar mediante ADR cuando corresponda.

## 26. Reglas para código generado por IA

- El código generado por IA está sujeto a las mismas reglas, revisión y validaciones que el código escrito manualmente.
- El agente debe comprender el contexto antes de generar o modificar código.
- No aceptar bloques generados sin comprobar tipos, imports, APIs y compatibilidad con las versiones instaladas.
- No inventar módulos, endpoints, variables de entorno, servicios o funcionalidades inexistentes.
- Mantener el cambio mínimo y evitar refactorizaciones no solicitadas.
- No introducir dependencias sin autorización y justificación.
- No generar secretos, credenciales, datos personales ni ejemplos con valores reales.
- Revisar el diff completo y eliminar código redundante, comentarios artificiales y scaffolding innecesario.
- Ejecutar las validaciones aplicables o declarar claramente cuáles no se ejecutaron y por qué.
- Identificar incertidumbres, riesgos y supuestos; no presentar resultados no verificados como hechos.
- Preservar cambios preexistentes y no modificar archivos fuera del alcance autorizado.

## 27. Cumplimiento

Antes de finalizar un cambio, se debe confirmar:

1. El código respeta la arquitectura por capas y los límites Nx.
2. Los tipos y las entradas externas están correctamente validados.
3. Los errores y logs no exponen información sensible.
4. Las pruebas y validaciones aplicables fueron ejecutadas o reportadas como pendientes.
5. El diff contiene únicamente los cambios necesarios.
6. La documentación afectada está actualizada.

Una desviación conocida debe quedar explícita en la revisión y no puede ocultarse mediante excepciones de lint, tipos o pruebas.
