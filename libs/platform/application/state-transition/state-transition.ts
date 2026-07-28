import { executeApplicationPipeline } from '../pipeline';
import type {
  StateTransition,
  StateTransitionContext,
  StateTransitionDependencies,
  StateTransitionResult,
} from './state-transition.types';

export function createStateTransition<TEntity>(
  dependencies: Partial<StateTransitionDependencies<TEntity>> = {},
): StateTransition<TEntity> {
  const executePipeline =
    dependencies.executePipeline ?? executeApplicationPipeline;

  return {
    execute(
      context: StateTransitionContext<TEntity>,
    ): StateTransitionResult<TEntity> {
      const pipelineResult = executePipeline({
        processRequest: context.processRequest,
      });

      return {
        entity: context.entity,
        pipelineResult,
      };
    },
  };
}
