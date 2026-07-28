import type {
  ApplicationPipelineRequest,
  ApplicationPipelineResult,
} from '../pipeline';
import type { ProcessRequest } from '../../engines/process';

type PipelineResultFor<TEntity> = [TEntity] extends [unknown]
  ? ApplicationPipelineResult
  : never;

export interface StateTransitionContext<TEntity> {
  readonly entity: TEntity;
  readonly processRequest: ProcessRequest;
}

export interface StateTransitionResult<TEntity> {
  readonly entity: TEntity;
  readonly pipelineResult: ApplicationPipelineResult;
}

export interface StateTransitionDependencies<TEntity> {
  readonly executePipeline: (
    request: ApplicationPipelineRequest,
  ) => PipelineResultFor<TEntity>;
}

export interface StateTransition<TEntity> {
  readonly execute: (
    context: StateTransitionContext<TEntity>,
  ) => StateTransitionResult<TEntity>;
}
