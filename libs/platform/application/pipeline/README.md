# Application Pipeline

Thin application-layer entry point for running Platform evaluations through the
Process Engine.

## Public API

```ts
import { createApplicationPipeline, executeApplicationPipeline } from '@nexus/platform';

const result = executeApplicationPipeline({ processRequest });
```

`executeApplicationPipeline` evaluates the supplied `ProcessRequest` exactly
once and projects the main `ProcessDecision` properties. The complete decision
is retained as `result.processDecision`.

Use `createApplicationPipeline` to inject a compatible process evaluator in
unit tests or future application use cases:

```ts
const pipeline = createApplicationPipeline({ evaluateProcess });
const result = pipeline.execute({ processRequest });
```

The pipeline is synchronous and pure. It does not interpret Process Engine
rules, mutate inputs, persist data, send notifications, or call external APIs.
