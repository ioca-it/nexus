import type { AuthenticatedActor, ProcessRequest } from '@nexus/platform';
import { PaymentNotificationStatus } from '../../domain/payment-notification.types';
import {
  PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
  PAYMENT_NOTIFICATION_WORKFLOW,
  PAYMENT_NOTIFICATION_WORKFLOW_ID,
} from '../payment-notification-workflow';

export interface PaymentNotificationProcessRequestInput {
  readonly actor: AuthenticatedActor;
  readonly currentState: PaymentNotificationStatus;
  readonly action: string;
  readonly approvalGroupIds?: readonly string[];
}

export function normalizePaymentNotificationApprovalGroupIds(
  approvalGroupIds: readonly string[],
): readonly string[] {
  if (!approvalGroupIds || approvalGroupIds.length === 0) {
    throw new Error('At least one approval group ID is required');
  }

  const normalizedGroupIds: string[] = [];
  const uniqueGroupIds = new Set<string>();

  for (const candidate of approvalGroupIds) {
    const groupId = candidate.trim();

    if (groupId.length === 0) {
      throw new Error('Approval group IDs must not be empty');
    }

    if (!uniqueGroupIds.has(groupId)) {
      uniqueGroupIds.add(groupId);
      normalizedGroupIds.push(groupId);
    }
  }

  return Object.freeze(normalizedGroupIds);
}

export function createPaymentNotificationProcessRequest(
  input: PaymentNotificationProcessRequestInput,
): ProcessRequest {
  const eventId = `payment-notification.${input.action.replace(/_/g, '-')}`;
  const approvalGroupIds = Object.freeze([...(input.approvalGroupIds ?? [])]);
  const approvalGroups = Object.freeze(
    approvalGroupIds.map((groupId) =>
      Object.freeze({
        groupId,
        // La identidad proviene del actor autorizado; los roles no participan.
        approverIds: Object.freeze([input.actor.userId]),
      }),
    ),
  );

  return Object.freeze({
    permissionRequest: Object.freeze({
      permissions: input.actor.permissions,
      module: PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
      action: input.action,
    }),
    workflowConfiguration: Object.freeze({
      workflows: Object.freeze([PAYMENT_NOTIFICATION_WORKFLOW]),
      routes: Object.freeze([
        Object.freeze({
          eventId,
          enabled: true,
          workflowId: PAYMENT_NOTIFICATION_WORKFLOW_ID,
          approvalGroupIds,
        }),
      ]),
      approvalGroups,
    }),
    workflowEvent: Object.freeze({
      eventId,
      module: PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
      action: input.action,
    }),
    currentState: input.currentState,
    action: input.action,
    notificationConfiguration: Object.freeze({
      templates: Object.freeze([]),
      routes: Object.freeze([
        Object.freeze({
          eventId,
          enabled: false,
          channels: Object.freeze([]),
          templateIds: Object.freeze([]),
          recipientGroups: Object.freeze([]),
        }),
      ]),
      recipientGroups: Object.freeze([]),
    }),
    notificationEvent: Object.freeze({
      eventId,
      module: PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
      action: input.action,
    }),
    actorContext: Object.freeze({
      userId: input.actor.userId,
      approvalGroupIds: input.actor.approvalGroupIds,
    }),
  });
}
