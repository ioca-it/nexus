import { evaluateProcess } from '../../engines/process';
import type {
  ApplicationPipeline,
  ApplicationPipelineDependencies,
  ApplicationPipelineRequest,
  ApplicationPipelineResult,
} from './application-pipeline.types';

export function createApplicationPipeline(
  dependencies: ApplicationPipelineDependencies = { evaluateProcess },
): ApplicationPipeline {
  return {
    execute(request: ApplicationPipelineRequest): ApplicationPipelineResult {
      const processDecision = dependencies.evaluateProcess(
        request.processRequest,
      );

      return {
        allowed: processDecision.allowed,
        valid: processDecision.valid,
        nextState: processDecision.nextState,
        requireApproval: processDecision.requireApproval,
        notificationsEnabled: processDecision.notificationsEnabled,
        reason: processDecision.reason,
        processDecision,
      };
    },
  };
}

const applicationPipeline = createApplicationPipeline();

export function executeApplicationPipeline(
  request: ApplicationPipelineRequest,
): ApplicationPipelineResult {
  return applicationPipeline.execute(request);
}
