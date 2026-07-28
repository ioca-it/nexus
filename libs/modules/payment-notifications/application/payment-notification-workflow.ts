import type { Workflow } from '@nexus/platform';
import { PaymentNotificationStatus } from '../domain/payment-notification.types';

export const PAYMENT_NOTIFICATION_WORKFLOW_ID =
  'payment-notification-workflow';

export const PAYMENT_NOTIFICATION_ACTIONS = Object.freeze({
  SUBMIT: 'submit',
  START_REVIEW: 'start_review',
  VALIDATE: 'validate',
  REJECT: 'reject',
  REQUEST_CHANGES: 'request_changes',
  RESUBMIT: 'resubmit',
} as const);

export const PAYMENT_NOTIFICATIONS_PERMISSION_MODULE = 'payment-notifications';

export const PAYMENT_NOTIFICATION_PERMISSION_ACTIONS = Object.freeze({
  CREATE_DRAFT: 'create_draft',
  UPDATE: 'update',
  ...PAYMENT_NOTIFICATION_ACTIONS,
} as const);

export const PAYMENT_NOTIFICATION_WORKFLOW: Workflow = Object.freeze({
  workflowId: PAYMENT_NOTIFICATION_WORKFLOW_ID,
  initialState: PaymentNotificationStatus.DRAFT,
  states: Object.freeze([
    PaymentNotificationStatus.DRAFT,
    PaymentNotificationStatus.SUBMITTED,
    PaymentNotificationStatus.UNDER_REVIEW,
    PaymentNotificationStatus.VALIDATED,
    PaymentNotificationStatus.REJECTED,
    PaymentNotificationStatus.CHANGES_REQUESTED,
  ]),
  transitions: Object.freeze([
    Object.freeze({
      fromState: PaymentNotificationStatus.DRAFT,
      toState: PaymentNotificationStatus.SUBMITTED,
      action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
      requireApproval: false,
    }),
    Object.freeze({
      fromState: PaymentNotificationStatus.SUBMITTED,
      toState: PaymentNotificationStatus.UNDER_REVIEW,
      action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      requireApproval: false,
    }),
    Object.freeze({
      fromState: PaymentNotificationStatus.UNDER_REVIEW,
      toState: PaymentNotificationStatus.VALIDATED,
      action: PAYMENT_NOTIFICATION_ACTIONS.VALIDATE,
      requireApproval: true,
    }),
    Object.freeze({
      fromState: PaymentNotificationStatus.UNDER_REVIEW,
      toState: PaymentNotificationStatus.REJECTED,
      action: PAYMENT_NOTIFICATION_ACTIONS.REJECT,
      requireApproval: true,
    }),
    Object.freeze({
      fromState: PaymentNotificationStatus.UNDER_REVIEW,
      toState: PaymentNotificationStatus.CHANGES_REQUESTED,
      action: PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
      requireApproval: true,
    }),
    Object.freeze({
      fromState: PaymentNotificationStatus.CHANGES_REQUESTED,
      toState: PaymentNotificationStatus.SUBMITTED,
      action: PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
      requireApproval: false,
    }),
  ]),
});
