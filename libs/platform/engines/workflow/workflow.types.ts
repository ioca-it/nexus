export interface WorkflowTransition {
  readonly fromState: string;
  readonly toState: string;
  readonly action: string;
  readonly requireApproval: boolean;
}

export interface Workflow {
  readonly workflowId: string;
  readonly initialState: string;
  readonly states: readonly string[];
  readonly transitions: readonly WorkflowTransition[];
}

export interface WorkflowTransitionRequest {
  readonly workflow: Workflow;
  readonly currentState: string;
  readonly action: string;
}

export interface WorkflowTransitionDecision {
  readonly allowed: boolean;
  readonly nextState: string | null;
  readonly requireApproval: boolean;
  readonly reason: string;
}
