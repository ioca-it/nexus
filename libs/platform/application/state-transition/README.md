# State Transition

Generic application-layer abstraction for use cases that evaluate a state
transition through the Application Pipeline.

```ts
import { createStateTransition } from '@nexus/platform';

const transition = createStateTransition<Entity>();
const result = transition.execute({ entity, processRequest });
```

The default implementation calls `executeApplicationPipeline()` exactly once.
An `executePipeline` dependency can be injected for unit tests.

The abstraction preserves the entity and pipeline result references. It does
not load, modify, or persist entities and contains no repository,
infrastructure, business-module, workflow, or concrete-state knowledge.
