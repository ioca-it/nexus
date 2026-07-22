# Flujo de trabajo oficial de NEXUS

## 1. Propósito y alcance

Este documento define el flujo de trabajo oficial para analizar, implementar, validar, revisar y entregar cambios en NEXUS. Aplica a personas, Codex, ChatGPT y cualquier otro agente de IA que trabaje en el Nx Monorepo.

Debe utilizarse junto con:

- `.ai/AGENTS.md`
- `.ai/architecture.md`
- `.ai/coding-standards.md`
- `.ai/security.md`
- `.ai/roadmap.md`
- `.ai/adr/`

El objetivo es mantener cambios pequeños, seguros, trazables, verificables y limitados al alcance autorizado.

## 2. Clasificación de acciones

### 2.1 Pasos obligatorios

Salvo que la tarea los prohíba expresamente, todo cambio debe incluir:

1. Recepción y análisis de la solicitud.
2. Confirmación del alcance.
3. Inspección del estado actual.
4. Diseño mínimo previo.
5. Identificación de archivos y proyectos afectados.
6. Implementación del cambio mínimo.
7. Validaciones proporcionales al riesgo.
8. Revisión del diff.
9. Actualización de documentación cuando corresponda.
10. Reporte final verificable.

### 2.2 Acciones que requieren autorización explícita

Un agente no puede inferir autorización para:

- Crear, cambiar, eliminar o renombrar ramas.
- Crear, modificar, enmendar o eliminar commits.
- Ejecutar push, force push, fetch con efectos no previstos o publicar tags.
- Crear, actualizar, aprobar o fusionar pull requests.
- Desplegar aplicaciones o servicios.
- Cambiar infraestructura, Azure, Key Vault, tenants, permisos o credenciales.
- Crear, leer, mostrar, rotar o modificar secretos.
- Modificar variables de entorno reales.
- Instalar o actualizar dependencias fuera del alcance aprobado.
- Eliminar archivos, datos o recursos.
- Reescribir historial o descartar cambios existentes.
- Ampliar el alcance original.

La autorización debe ser específica, vigente y aplicable a la acción y destino concretos.

## 3. Recepción y análisis de tareas

Al recibir una tarea se debe:

- Leer la solicitud completa y detectar restricciones explícitas.
- Leer `.ai/AGENTS.md` y los documentos aplicables al alcance.
- Identificar el objetivo observable y los criterios de aceptación.
- Separar hechos confirmados de supuestos.
- Detectar acciones destructivas, externas o sensibles.
- Determinar si la tarea solicita análisis, diagnóstico, implementación o ejecución operativa.
- No comenzar a modificar hasta comprender el problema y sus límites.

Si la solicitud ya está satisfecha por el estado actual, se debe verificar y reportar sin introducir cambios innecesarios.

## 4. Confirmación del alcance

Antes de implementar se debe definir:

- Qué comportamiento debe cambiar.
- Qué proyectos, librerías o documentos están incluidos.
- Qué elementos están explícitamente excluidos.
- Qué validaciones están autorizadas o prohibidas.
- Qué compatibilidad debe mantenerse.
- Qué acciones requieren una decisión adicional del solicitante.

No es necesario pedir confirmación cuando el alcance es claro, reversible y acotado. Se debe solicitar aclaración cuando una suposición pueda cambiar materialmente el resultado, afectar datos, seguridad, infraestructura o consumidores no incluidos.

La ausencia de una prohibición no autoriza una ampliación de alcance.

## 5. Inspección del código existente

La inspección es obligatoria antes de modificar código.

Se debe:

- Revisar la estructura del proyecto afectado.
- Leer completamente los archivos de gobernanza aplicables.
- Leer los archivos que serán modificados y sus consumidores relevantes.
- Identificar patrones, convenciones y puntos de entrada públicos existentes.
- Revisar configuración Nx, TypeScript, lint y tests cuando sean relevantes.
- Comprobar el estado del repositorio para preservar cambios ajenos o preexistentes.
- Buscar implementaciones similares antes de crear una nueva.
- No leer secretos, variables de entorno reales o archivos sensibles sin autorización.

La inspección debe ser de solo lectura y limitarse a información necesaria para la tarea.

## 6. Diseño previo a la implementación

Antes de escribir código se debe definir una solución mínima que indique:

- Responsabilidad de cada cambio.
- Capa arquitectónica correspondiente.
- Contratos de entrada y salida afectados.
- Dependencias nuevas o modificadas.
- Riesgos de seguridad, compatibilidad y rendimiento.
- Estrategia de validación.
- Forma segura de reversión.

El diseño debe respetar Clean Architecture, límites Nx, separación browser/server y principios SOLID cuando aporten valor. No se deben crear abstracciones, extensibilidad ni infraestructura para escenarios hipotéticos.

Una decisión con impacto duradero debe registrarse mediante ADR antes o dentro del mismo cambio.

## 7. Identificación de archivos afectados

Antes de editar se debe identificar:

- Archivos que necesariamente deben cambiar.
- Archivos consumidores que pueden verse afectados.
- Tests relacionados.
- Configuración o documentación que debe mantenerse sincronizada.
- Proyectos Nx afectados directa e indirectamente.

Se debe modificar el menor número posible de archivos. No se deben incluir refactorizaciones, cambios de formato o ajustes de estilo no relacionados.

Si durante la implementación aparece la necesidad de modificar archivos fuera del alcance confirmado, se debe detener esa ampliación y solicitar autorización.

## 8. Implementación del cambio mínimo

La implementación debe:

- Resolver únicamente el objetivo solicitado.
- Seguir el estilo y la arquitectura existentes.
- Mantener tipado estricto y validación en límites externos.
- Preservar compatibilidad hacia atrás cuando sea posible.
- Evitar duplicación, código muerto y dependencias innecesarias.
- Mantener Controllers y React Components sin lógica de negocio.
- Preservar cambios preexistentes no relacionados.
- Evitar modificar archivos generados o artefactos de build.
- Incluir pruebas cuando se introduce o modifica comportamiento verificable.

No se debe utilizar una implementación temporal insegura con la expectativa de corregirla posteriormente.

## 9. Validaciones obligatorias

Para una implementación, las validaciones mínimas son:

- Build del proyecto afectado.
- Lint cuando exista configuración aplicable.
- Tests relacionados existentes.
- Tests nuevos cuando el comportamiento lo requiera.
- Validación de proyectos consumidores o dependientes relevantes.
- Comprobación de tipos cuando no esté incluida en el build.

Las validaciones deben ser proporcionales al riesgo. Un cambio documental no requiere build salvo que exista una validación documental específica.

Si una tarea prohíbe builds o validaciones, estas no deben ejecutarse. El reporte final debe identificarlas como no ejecutadas y explicar el motivo.

Nunca se debe afirmar que una validación pasó sin haberla ejecutado.

## 10. Uso preferente de Nx

Se deben preferir validaciones específicas del proyecto o del conjunto afectado:

```text
pnpm exec nx build <project>
pnpm exec nx lint <project>
pnpm exec nx test <project>
pnpm exec nx e2e <e2e-project>
pnpm exec nx affected -t lint,test,build
```

Reglas:

- Ejecutar primero el target más específico que aporte evidencia suficiente.
- Usar `affected` cuando el cambio alcance varios proyectos o consumidores.
- No ejecutar todo el monorepo sin necesidad.
- No omitir dependientes relevantes únicamente para ahorrar tiempo.
- No ejecutar comandos de build si la tarea los prohíbe.
- Registrar el comando y resultado real en el reporte final.

Los comandos anteriores son referencias de flujo, no autorización automática para ejecutarlos.

## 11. Revisión del diff

Antes de finalizar se debe revisar el diff completo y confirmar:

- Solo cambiaron los archivos autorizados.
- El cambio corresponde al alcance solicitado.
- No existen secretos, credenciales ni datos sensibles.
- No se añadieron artefactos, cachés o archivos generados accidentalmente.
- No se eliminaron cambios preexistentes.
- No hay imports, código, comentarios o dependencias sin uso.
- Los contratos y la documentación permanecen sincronizados.
- El formato no oculta cambios funcionales.
- Los tests y validaciones cubren el riesgo introducido.

Si el repositorio ya estaba modificado, se debe distinguir claramente entre cambios propios y preexistentes.

## 12. Manejo de errores y bloqueos

Ante un error se debe:

1. Conservar el mensaje y contexto relevante sin exponer secretos.
2. Determinar si el fallo proviene del cambio, del entorno o de una condición preexistente.
3. Aplicar una corrección mínima dentro del alcance si es segura.
4. Repetir la validación relevante después de corregir.
5. Reportar el error si no puede resolverse sin ampliar alcance o autorización.

Se considera bloqueo cuando completar la tarea requiere información, acceso, autorización o estado externo no disponible.

No se debe:

- Ocultar o ignorar errores.
- Desactivar tests, lint, tipos o controles de seguridad.
- Repetir indefinidamente una operación sin nueva evidencia.
- Inventar resultados o configuración.
- Ejecutar acciones destructivas para desbloquear el trabajo.

## 13. Reporte final

El reporte debe ser breve, verificable y seguir este formato:

### Resumen

Qué se logró y si el objetivo quedó completo.

### Archivos modificados

Lista exacta de archivos modificados o indicación de que no hubo cambios.

### Validaciones

Comandos o revisiones ejecutadas, resultado y validaciones no ejecutadas con motivo.

### Pendientes

Riesgos, bloqueos o trabajo restante. Usar `Ninguno` cuando no existan.

### Próximo paso sugerido

Una acción concreta y relevante, sin ampliar automáticamente el alcance.

## 14. Creación y uso de ramas

La creación, cambio, renombrado o eliminación de ramas por un agente requiere autorización explícita.

Cuando esté autorizada:

- Partir de la rama base indicada y actualizada mediante el flujo aprobado.
- Usar una rama por objetivo coherente.
- Evitar mezclar tareas independientes.
- No cambiar de rama con cambios sin confirmar sin comprobar su impacto.
- No eliminar ramas remotas o compartidas sin autorización específica.

Convención recomendada:

```text
<tipo>/<descripcion-breve-en-kebab-case>
```

Tipos sugeridos: `feature`, `fix`, `docs`, `refactor`, `test`, `chore` y `security`.

## 15. Flujo de commits

Un agente no puede crear, enmendar, revertir ni eliminar commits sin autorización explícita.

Cuando crear un commit esté autorizado:

1. Revisar estado y diff.
2. Confirmar que las validaciones requeridas terminaron satisfactoriamente o están reportadas.
3. Preparar únicamente archivos pertenecientes al cambio.
4. Verificar el contenido staged.
5. Crear un commit atómico con mensaje conforme a la convención.
6. Confirmar el resultado sin modificar otros commits.

No se debe usar `--amend`, rebase, squash, reset destructivo o firma no disponible sin autorización específica.

## 16. Convención de mensajes de commit

Cuando los commits estén autorizados, se debe usar Conventional Commits:

```text
<tipo>(<scope-opcional>): <descripcion-imperativa>
```

Tipos principales:

- `feat`: capacidad nueva.
- `fix`: corrección de comportamiento.
- `docs`: documentación exclusivamente.
- `refactor`: cambio interno sin alterar comportamiento.
- `test`: pruebas.
- `build`: sistema de build o dependencias de build.
- `ci`: integración continua.
- `chore`: mantenimiento sin impacto funcional.
- `security`: endurecimiento o corrección de seguridad.

Reglas:

- Descripción breve, concreta y en modo imperativo.
- Scope alineado con proyecto o capacidad cuando aporte claridad.
- No mencionar información sensible.
- Documentar cambios incompatibles mediante `BREAKING CHANGE:` solo cuando estén expresamente autorizados.

## 17. Flujo de push

Todo push requiere autorización explícita que identifique al menos la rama y el remoto previstos.

Antes de un push autorizado se debe:

- Confirmar rama actual, remoto y commits que se enviarán.
- Confirmar que no existen secretos ni commits ajenos inesperados.
- Verificar el estado de las validaciones requeridas.
- Usar un push normal y no destructivo.

No se debe hacer force push, publicar tags o enviar a una rama protegida sin autorización específica. Un commit autorizado no implica autorización para push.

## 18. Pull requests

Crear, actualizar, aprobar, cerrar o fusionar un pull request requiere autorización explícita.

Un pull request debe incluir:

- Objetivo y contexto.
- Resumen de la solución.
- Archivos o áreas principales afectadas.
- Validaciones y evidencia relevante.
- Riesgos, compatibilidad y estrategia de reversión.
- Referencias a tarea y ADR cuando correspondan.
- Capturas o evidencia visual únicamente cuando sean necesarias y no contengan datos sensibles.

El alcance del pull request debe ser revisable y no mezclar cambios independientes.

## 19. Revisión de código

La revisión debe comprobar:

- Cumplimiento del alcance y criterios de aceptación.
- Respeto de `.ai/architecture.md`, estándares y límites Nx.
- Corrección, seguridad, rendimiento y mantenibilidad.
- Tipos, validación, errores y logging.
- Compatibilidad con consumidores.
- Pruebas proporcionales al riesgo.
- Accesibilidad en cambios de interfaz.
- Ausencia de secretos y cambios accidentales.
- Documentación y ADR actualizados.

Los comentarios de revisión deben ser concretos, accionables y distinguir bloqueos de sugerencias opcionales.

## 20. Resolución de conflictos

Los conflictos deben resolverse comprendiendo la intención de ambos cambios, nunca eligiendo automáticamente una versión completa.

Se debe:

- Inspeccionar cada lado y sus cambios relacionados.
- Preservar comportamiento y trabajo ajeno válido.
- Consultar al propietario cuando la intención no sea verificable.
- Resolver el conjunto mínimo de archivos.
- Revisar el diff resultante.
- Repetir las validaciones afectadas.

Un agente necesita autorización antes de iniciar merge, rebase u otra operación que pueda generar o resolver conflictos. No se debe usar reset destructivo ni sobrescribir archivos para resolverlos.

## 21. Control de versiones

- Mantener compatibilidad hacia atrás cuando sea posible.
- No cambiar versiones, publicar paquetes o crear tags sin autorización.
- Tratar cambios de contratos públicos como decisiones explícitas.
- Usar versionado semántico cuando se formalicen releases o paquetes versionados.
- Sincronizar manifiestos y lockfile únicamente cuando cambien dependencias autorizadas.
- Documentar migraciones y cambios incompatibles.
- No asumir que la versión raíz actual representa una política de releases ya implementada.

La automatización de releases y versionado es una decisión futura que debe documentarse antes de adoptarse.

## 22. Reversión de cambios

Toda implementación debe ser razonablemente reversible.

Reglas:

- Preferir cambios pequeños que puedan revertirse de forma aislada.
- En historial compartido, preferir un commit de reversión sobre reescritura de historia.
- Revisar impacto en datos, contratos, configuración y migraciones antes de revertir.
- No restaurar, eliminar o sobrescribir archivos con cambios ajenos.
- No usar `git reset --hard`, force push ni comandos destructivos sin autorización explícita y específica.
- Validar el estado resultante después de una reversión autorizada.

Crear una reversión, modificar historial o restaurar archivos requiere autorización cuando pueda descartar trabajo o afectar un repositorio compartido.

## 23. Trabajo con Codex, ChatGPT y otros agentes de IA

Todo agente debe:

- Leer `.ai/AGENTS.md` y los documentos aplicables antes de actuar.
- Analizar el repositorio en lugar de asumir su estructura.
- Distinguir hechos, inferencias, arquitectura propuesta e implementación futura.
- Modificar únicamente archivos autorizados.
- No inventar APIs, variables, integraciones, resultados o validaciones.
- Preservar cambios preexistentes.
- No revelar secretos ni inspeccionar datos sensibles sin autorización.
- Revisar su propio diff y reportar limitaciones.
- Aplicar las mismas pruebas y estándares exigidos al código humano.
- Detenerse cuando una acción requiera autorización no otorgada.

El usuario mantiene control sobre decisiones irreversibles, externas, sensibles y de publicación.

## 24. Prohibición de commit, push y despliegue sin autorización

Las siguientes reglas son absolutas salvo autorización explícita, específica y vigente:

- No hacer commit.
- No hacer push.
- No crear ni publicar tags.
- No fusionar ramas o pull requests.
- No desplegar.
- No cambiar infraestructura.
- No publicar paquetes o releases.

Las frases `terminar`, `completar`, `entregar` o equivalentes no amplían por sí mismas la autorización. La autorización para una acción no implica las siguientes: por ejemplo, autorizar un commit no autoriza un push ni un despliegue.

## 25. Registro de decisiones mediante ADR

Se requiere un ADR cuando una decisión:

- Cambia límites entre capas o proyectos.
- Introduce una tecnología o dependencia estratégica.
- Define propiedad o sincronización de datos.
- Cambia autenticación, autorización o manejo de secretos.
- Introduce un patrón duradero o una excepción arquitectónica.
- Cambia compatibilidad, despliegue o estrategia de escalabilidad.
- Tiene alternativas relevantes y consecuencias a largo plazo.

El ADR debe registrarse en `.ai/adr/` dentro del mismo cambio, salvo que la tarea limite expresamente la edición documental. No se requiere ADR para correcciones locales sin consecuencia arquitectónica.

## 26. Actualización de documentación

La documentación debe actualizarse dentro del mismo cambio cuando este modifique:

- Arquitectura vigente, arquitectura propuesta o implementación actual.
- Contratos, configuración o procedimientos.
- Seguridad, permisos o riesgos.
- Flujo de desarrollo, validación o despliegue.
- Comportamiento que consumidores u operadores necesiten conocer.

No se debe documentar una funcionalidad futura como implementada. Los comentarios de código no sustituyen documentación oficial ni ADR.

## 27. Criterios para considerar una tarea terminada

Una tarea está terminada únicamente cuando:

1. El objetivo y los criterios de aceptación están satisfechos.
2. El cambio permanece dentro del alcance autorizado.
3. La arquitectura y los estándares aplicables se respetan.
4. Los archivos afectados fueron revisados.
5. Las validaciones obligatorias fueron ejecutadas satisfactoriamente o quedaron explícitamente impedidas y reportadas.
6. Los proyectos relacionados relevantes no presentan regresiones conocidas.
7. El diff fue revisado y no contiene cambios accidentales ni secretos.
8. Las pruebas y documentación necesarias están actualizadas.
9. Los riesgos, limitaciones y pendientes están reportados.
10. No queda ninguna acción requerida dentro del alcance pendiente de ejecución.

Commit, push, pull request, merge o despliegue no forman parte implícita de la definición de terminado y solo se ejecutan cuando se autorizan por separado.

## 28. Resumen operativo

```text
Recibir
  -> Analizar
  -> Confirmar alcance
  -> Inspeccionar
  -> Disenar
  -> Identificar impacto
  -> Implementar cambio minimo
  -> Validar
  -> Revisar diff
  -> Documentar
  -> Reportar

Commit -> Push -> Pull request -> Merge -> Deploy
  Cada transicion requiere la autorizacion correspondiente.
```
