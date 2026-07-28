import { resolveNotificationConfiguration } from '../../configuration/notifications';
import { resolveWorkflowConfiguration } from '../../configuration/workflow';
import { evaluatePermission } from '../permissions';
import { evaluateTransition } from '../workflow';
import type { ProcessDecision, ProcessRequest } from './process.types';

const PROCESS_ALLOWED_REASON = 'Process allowed';
const ACTOR_CONTEXT_REQUIRED_REASON = 'Actor context is required for approval';
const APPROVAL_GROUPS_NOT_CONFIGURED_REASON =
  'Approval groups are not configured';
const ACTOR_NOT_APPROVER_REASON =
  'Actor is not a member of a required approval group';

function createStoppedDecision(
  reason: string,
  valid: boolean,
  requireApproval = false,
): ProcessDecision {
  return {
    allowed: false,
    nextState: null,
    requireApproval,
    notificationsEnabled: false,
    valid,
    reason,
  };
}

export function evaluateProcess(request: ProcessRequest): ProcessDecision {
  const permissionDecision = evaluatePermission(request.permissionRequest);

  if (!permissionDecision.allowed) {
    return createStoppedDecision(permissionDecision.reason, true);
  }

  const workflowResolution = resolveWorkflowConfiguration(
    request.workflowConfiguration,
    request.workflowEvent,
  );

  if (
    !workflowResolution.valid ||
    !workflowResolution.enabled ||
    !workflowResolution.workflow
  ) {
    return createStoppedDecision(
      workflowResolution.reason,
      workflowResolution.valid,
    );
  }

  const transitionDecision = evaluateTransition({
    workflow: workflowResolution.workflow,
    currentState: request.currentState,
    action: request.action,
  });

  if (!transitionDecision.allowed) {
    return createStoppedDecision(transitionDecision.reason, true);
  }

  if (transitionDecision.requireApproval) {
    if (!request.actorContext) {
      return createStoppedDecision(ACTOR_CONTEXT_REQUIRED_REASON, true, true);
    }

    if (workflowResolution.approvalGroups.length === 0) {
      return createStoppedDecision(
        APPROVAL_GROUPS_NOT_CONFIGURED_REASON,
        false,
        true,
      );
    }

    // Opti ChatGPT: el índice permite comprobar la intersección exacta en O(n + m).
    const requiredApprovalGroupIds = new Set(
      workflowResolution.approvalGroups.map((group) => group.groupId),
    );
    const isApprover = request.actorContext.approvalGroupIds.some((groupId) =>
      requiredApprovalGroupIds.has(groupId),
    );

    if (!isApprover) {
      return createStoppedDecision(ACTOR_NOT_APPROVER_REASON, true, true);
    }
  }

  const notificationResolution = resolveNotificationConfiguration(
    request.notificationConfiguration,
    request.notificationEvent,
  );

  return {
    allowed: true,
    nextState: transitionDecision.nextState,
    requireApproval: transitionDecision.requireApproval,
    notificationsEnabled:
      notificationResolution.valid && notificationResolution.enabled,
    valid: notificationResolution.valid,
    reason: notificationResolution.valid
      ? PROCESS_ALLOWED_REASON
      : notificationResolution.reason,
  };
}
