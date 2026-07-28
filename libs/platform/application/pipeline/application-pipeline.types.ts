import type { ProcessDecision, ProcessRequest } from '../../engines/process';

export interface ApplicationPipelineRequest {
  readonly processRequest: ProcessRequest;
}

export interface ApplicationPipelineResult {
  readonly allowed: boolean;
  readonly valid: boolean;
  readonly nextState: string | null;
  readonly requireApproval: boolean;
  readonly notificationsEnabled: boolean;
  readonly reason: string;
  readonly processDecision: ProcessDecision;
}

export interface ApplicationPipelineDependencies {
  readonly evaluateProcess: (request: ProcessRequest) => ProcessDecision;
}

export interface ApplicationPipeline {
  readonly execute: (
    request: ApplicationPipelineRequest,
  ) => ApplicationPipelineResult;
}
