import type { AuthenticatedActor, ProcessRequest } from '@nexus/platform';
import type { Order } from '../../domain';
import {
  ORDERS_PERMISSION_MODULE,
  type OrderPermissionAction,
} from '../security';
import { ORDER_WORKFLOW, ORDER_WORKFLOW_ID } from '../workflow';

export interface OrderProcessRequestInput {
  readonly actor: AuthenticatedActor;
  readonly order: Order;
  readonly action: OrderPermissionAction;
  readonly approvalGroupIds?: readonly string[];
}

function normalizeGroups(
  values: readonly string[] | undefined,
  required: boolean,
): readonly string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values ?? []) {
    const normalized = value.trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  if (required && result.length === 0)
    throw new Error('At least one approval group ID is required');
  return Object.freeze(result);
}

export function createOrderProcessRequest(
  input: OrderProcessRequestInput,
): ProcessRequest {
  const transition = ORDER_WORKFLOW.transitions.find(
    (candidate) =>
      candidate.fromState === input.order.status &&
      candidate.action === input.action,
  );
  if (!transition) throw new Error('Order workflow transition is not allowed');
  const approvalGroupIds = normalizeGroups(
    input.approvalGroupIds,
    transition.requireApproval,
  );
  const eventId = `order.${input.action.replace(/_/g, '-')}`;
  const approvalGroups = Object.freeze(
    approvalGroupIds.map((groupId) =>
      Object.freeze({
        groupId,
        approverIds: Object.freeze([input.actor.userId]),
      }),
    ),
  );
  return Object.freeze({
    permissionRequest: Object.freeze({
      permissions: input.actor.permissions,
      module: ORDERS_PERMISSION_MODULE,
      action: input.action,
    }),
    workflowConfiguration: Object.freeze({
      workflows: Object.freeze([ORDER_WORKFLOW]),
      routes: Object.freeze([
        Object.freeze({
          eventId,
          enabled: true,
          workflowId: ORDER_WORKFLOW_ID,
          approvalGroupIds,
        }),
      ]),
      approvalGroups,
    }),
    workflowEvent: Object.freeze({
      eventId,
      module: ORDERS_PERMISSION_MODULE,
      action: input.action,
    }),
    currentState: input.order.status,
    action: input.action,
    notificationConfiguration: Object.freeze({
      templates: Object.freeze([]),
      routes: Object.freeze([]),
      recipientGroups: Object.freeze([]),
    }),
    notificationEvent: Object.freeze({
      eventId,
      module: ORDERS_PERMISSION_MODULE,
      action: input.action,
    }),
    actorContext: Object.freeze({
      userId: input.actor.userId,
      approvalGroupIds: input.actor.approvalGroupIds,
    }),
  });
}
