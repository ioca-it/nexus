import { ORDER_STATUS } from '../../domain';
import { ORDERS_PERMISSION_ACTIONS } from '../security';
import { ORDER_WORKFLOW } from './order-workflow';

describe('ORDER_WORKFLOW', () => {
  it('contains exactly the approved six transitions', () => {
    expect(ORDER_WORKFLOW.transitions).toHaveLength(6);
    expect(ORDER_WORKFLOW.states).toEqual(Object.values(ORDER_STATUS));
    expect(
      ORDER_WORKFLOW.transitions.map((t) => [t.fromState, t.action, t.toState]),
    ).toEqual([
      [
        ORDER_STATUS.DRAFT,
        ORDERS_PERMISSION_ACTIONS.SUBMIT,
        ORDER_STATUS.SUBMITTED,
      ],
      [
        ORDER_STATUS.SUBMITTED,
        ORDERS_PERMISSION_ACTIONS.START_REVIEW,
        ORDER_STATUS.UNDER_REVIEW,
      ],
      [
        ORDER_STATUS.UNDER_REVIEW,
        ORDERS_PERMISSION_ACTIONS.REQUEST_CHANGES,
        ORDER_STATUS.CHANGES_REQUESTED,
      ],
      [
        ORDER_STATUS.UNDER_REVIEW,
        ORDERS_PERMISSION_ACTIONS.REJECT,
        ORDER_STATUS.REJECTED,
      ],
      [
        ORDER_STATUS.UNDER_REVIEW,
        ORDERS_PERMISSION_ACTIONS.APPROVE,
        ORDER_STATUS.APPROVED,
      ],
      [
        ORDER_STATUS.CHANGES_REQUESTED,
        ORDERS_PERMISSION_ACTIONS.RESUBMIT,
        ORDER_STATUS.SUBMITTED,
      ],
    ]);
  });
});
