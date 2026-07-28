import type {
  Workflow as EngineWorkflowDefinition,
  WorkflowTransition,
} from '../../engines/workflow';

export type WorkflowDefinition = EngineWorkflowDefinition & {
  readonly transitions: readonly WorkflowTransition[];
};

export interface WorkflowEvent {
  readonly eventId: string;
  readonly module: string;
  readonly action: string;
}

export interface ApprovalGroup {
  readonly groupId: string;
  readonly approverIds: readonly string[];
}

export interface WorkflowRoute {
  readonly eventId: string;
  readonly enabled: boolean;
  readonly workflowId: string;
  readonly approvalGroupIds: readonly string[];
}

export interface WorkflowConfiguration {
  readonly workflows: readonly WorkflowDefinition[];
  readonly routes: readonly WorkflowRoute[];
  readonly approvalGroups: readonly ApprovalGroup[];
}

export interface ResolvedWorkflowConfiguration {
  readonly enabled: boolean;
  readonly workflow: WorkflowDefinition | null;
  readonly approvalGroups: readonly ApprovalGroup[];
  readonly valid: boolean;
  readonly reason: string;
}
