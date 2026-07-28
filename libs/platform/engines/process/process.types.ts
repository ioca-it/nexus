import type {
  NotificationConfiguration,
  NotificationEvent,
} from '../../configuration/notifications';
import type {
  WorkflowConfiguration,
  WorkflowEvent,
} from '../../configuration/workflow';
import type { PermissionRequest } from '../permissions';

export interface ProcessActorContext {
  readonly userId: string;
  readonly approvalGroupIds: readonly string[];
}

export interface ProcessRequest {
  readonly permissionRequest: PermissionRequest;
  readonly workflowConfiguration: WorkflowConfiguration;
  readonly workflowEvent: WorkflowEvent;
  readonly currentState: string;
  readonly action: string;
  readonly notificationConfiguration: NotificationConfiguration;
  readonly notificationEvent: NotificationEvent;
  readonly actorContext?: ProcessActorContext;
}

export interface ProcessDecision {
  readonly allowed: boolean;
  readonly nextState: string | null;
  readonly requireApproval: boolean;
  readonly notificationsEnabled: boolean;
  readonly valid: boolean;
  readonly reason: string;
}
