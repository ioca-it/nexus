import type {
  ApprovalGroup,
  ResolvedWorkflowConfiguration,
  WorkflowConfiguration,
  WorkflowEvent,
} from './workflow-configuration.types';

const CONFIGURATION_RESOLVED_REASON = 'Workflow configuration resolved';
const ROUTE_NOT_FOUND_REASON = 'Workflow route not found';
const ROUTE_DISABLED_REASON = 'Workflow route disabled';
const WORKFLOW_NOT_FOUND_REASON = 'Workflow definition not found';
const APPROVAL_GROUP_NOT_FOUND_REASON = 'Approval group not found';
const APPROVER_NOT_FOUND_REASON = 'Approval group has no valid approvers';

function createResolution(
  enabled: boolean,
  valid: boolean,
  reason: string
): ResolvedWorkflowConfiguration {
  return {
    enabled,
    workflow: null,
    approvalGroups: [],
    valid,
    reason,
  };
}

export function resolveWorkflowConfiguration(
  configuration: WorkflowConfiguration,
  event: WorkflowEvent
): ResolvedWorkflowConfiguration {
  const route = configuration.routes.find(
    (candidate) => candidate.eventId === event.eventId
  );

  if (!route) {
    return createResolution(false, false, ROUTE_NOT_FOUND_REASON);
  }

  if (!route.enabled) {
    return createResolution(false, true, ROUTE_DISABLED_REASON);
  }

  const workflow = configuration.workflows.find(
    (candidate) => candidate.workflowId === route.workflowId
  );

  if (!workflow) {
    return createResolution(true, false, WORKFLOW_NOT_FOUND_REASON);
  }

  const approvalGroupsById = new Map<string, ApprovalGroup>();

  // Opti ChatGPT: el índice evita recorrer todos los grupos por cada referencia de la ruta.
  for (const group of configuration.approvalGroups) {
    approvalGroupsById.set(group.groupId, group);
  }

  const approvalGroups: ApprovalGroup[] = [];

  for (const groupId of route.approvalGroupIds) {
    const group = approvalGroupsById.get(groupId);

    if (!group) {
      return createResolution(true, false, APPROVAL_GROUP_NOT_FOUND_REASON);
    }

    const approverIds: string[] = [];
    const uniqueApproverIds = new Set<string>();

    // Opti ChatGPT: una sola pasada valida, filtra y deduplica los aprobadores del grupo.
    for (const approverId of group.approverIds) {
      if (
        approverId.trim().length > 0 &&
        !uniqueApproverIds.has(approverId)
      ) {
        uniqueApproverIds.add(approverId);
        approverIds.push(approverId);
      }
    }

    if (approverIds.length === 0) {
      return createResolution(true, false, APPROVER_NOT_FOUND_REASON);
    }

    approvalGroups.push({
      groupId: group.groupId,
      approverIds,
    });
  }

  return {
    enabled: true,
    workflow,
    approvalGroups,
    valid: true,
    reason: CONFIGURATION_RESOLVED_REASON,
  };
}
