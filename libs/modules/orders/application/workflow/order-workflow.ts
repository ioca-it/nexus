import type { Workflow } from '@nexus/platform';
import { ORDER_STATUS } from '../../domain';
import { ORDERS_PERMISSION_ACTIONS } from '../security';

export const ORDER_WORKFLOW_ID = 'orders-draft-lifecycle';

export const ORDER_WORKFLOW: Workflow = Object.freeze({
  workflowId: ORDER_WORKFLOW_ID,
  initialState: ORDER_STATUS.DRAFT,
  states: Object.freeze(Object.values(ORDER_STATUS)),
  transitions: Object.freeze([
    Object.freeze({
      fromState: ORDER_STATUS.DRAFT,
      action: ORDERS_PERMISSION_ACTIONS.SUBMIT,
      toState: ORDER_STATUS.SUBMITTED,
      requireApproval: false,
    }),
    Object.freeze({
      fromState: ORDER_STATUS.SUBMITTED,
      action: ORDERS_PERMISSION_ACTIONS.START_REVIEW,
      toState: ORDER_STATUS.UNDER_REVIEW,
      requireApproval: false,
    }),
    Object.freeze({
      fromState: ORDER_STATUS.UNDER_REVIEW,
      action: ORDERS_PERMISSION_ACTIONS.REQUEST_CHANGES,
      toState: ORDER_STATUS.CHANGES_REQUESTED,
      requireApproval: true,
    }),
    Object.freeze({
      fromState: ORDER_STATUS.UNDER_REVIEW,
      action: ORDERS_PERMISSION_ACTIONS.REJECT,
      toState: ORDER_STATUS.REJECTED,
      requireApproval: true,
    }),
    Object.freeze({
      fromState: ORDER_STATUS.UNDER_REVIEW,
      action: ORDERS_PERMISSION_ACTIONS.APPROVE,
      toState: ORDER_STATUS.APPROVED,
      requireApproval: true,
    }),
    Object.freeze({
      fromState: ORDER_STATUS.CHANGES_REQUESTED,
      action: ORDERS_PERMISSION_ACTIONS.RESUBMIT,
      toState: ORDER_STATUS.SUBMITTED,
      requireApproval: false,
    }),
  ]),
});
