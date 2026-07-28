import type {
  WorkflowTransitionDecision,
  WorkflowTransitionRequest,
} from './workflow.types';

const TRANSITION_ALLOWED_REASON = 'Transition allowed';
const TRANSITION_NOT_DEFINED_REASON = 'Transition not defined';
const CURRENT_STATE_NOT_FOUND_REASON = 'Current state does not exist';

export function evaluateTransition(
  request: WorkflowTransitionRequest
): WorkflowTransitionDecision {
  if (!request.workflow.states.includes(request.currentState)) {
    return {
      allowed: false,
      nextState: null,
      requireApproval: false,
      reason: CURRENT_STATE_NOT_FOUND_REASON,
    };
  }

  // Opti ChatGPT: una sola pasada permite finalizar al encontrar la transición exacta.
  for (const transition of request.workflow.transitions) {
    if (
      transition.fromState === request.currentState &&
      transition.action === request.action
    ) {
      return {
        allowed: true,
        nextState: transition.toState,
        requireApproval: transition.requireApproval,
        reason: TRANSITION_ALLOWED_REASON,
      };
    }
  }

  return {
    allowed: false,
    nextState: null,
    requireApproval: false,
    reason: TRANSITION_NOT_DEFINED_REASON,
  };
}
