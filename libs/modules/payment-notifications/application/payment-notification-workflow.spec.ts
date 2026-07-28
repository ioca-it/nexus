import { evaluateTransition } from '@nexus/platform';
import { PaymentNotificationStatus } from '../domain/payment-notification.types';
import {
  PAYMENT_NOTIFICATION_ACTIONS,
  PAYMENT_NOTIFICATION_PERMISSION_ACTIONS,
  PAYMENT_NOTIFICATION_WORKFLOW,
} from './payment-notification-workflow';

describe('PAYMENT_NOTIFICATION_WORKFLOW', () => {
  it('allows DRAFT to submit into SUBMITTED', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.DRAFT,
        action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
      })
    ).toMatchObject({
      allowed: true,
      nextState: PaymentNotificationStatus.SUBMITTED,
      requireApproval: false,
    });
  });

  it('allows SUBMITTED to start review into UNDER_REVIEW', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.SUBMITTED,
        action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      })
    ).toMatchObject({
      allowed: true,
      nextState: PaymentNotificationStatus.UNDER_REVIEW,
      requireApproval: false,
    });
  });

  it('allows UNDER_REVIEW to validate into VALIDATED with approval', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.UNDER_REVIEW,
        action: PAYMENT_NOTIFICATION_ACTIONS.VALIDATE,
      })
    ).toMatchObject({
      allowed: true,
      nextState: PaymentNotificationStatus.VALIDATED,
      requireApproval: true,
    });
  });

  it('allows UNDER_REVIEW to reject into REJECTED with approval', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.UNDER_REVIEW,
        action: PAYMENT_NOTIFICATION_ACTIONS.REJECT,
      })
    ).toMatchObject({
      allowed: true,
      nextState: PaymentNotificationStatus.REJECTED,
      requireApproval: true,
    });
  });

  it('allows UNDER_REVIEW to request changes with approval', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.UNDER_REVIEW,
        action: PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
      })
    ).toMatchObject({
      allowed: true,
      nextState: PaymentNotificationStatus.CHANGES_REQUESTED,
      requireApproval: true,
    });
  });

  it('allows CHANGES_REQUESTED to resubmit into SUBMITTED', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.CHANGES_REQUESTED,
        action: PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
      })
    ).toMatchObject({
      allowed: true,
      nextState: PaymentNotificationStatus.SUBMITTED,
      requireApproval: false,
    });
  });

  it('does not allow DRAFT to validate', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.DRAFT,
        action: PAYMENT_NOTIFICATION_ACTIONS.VALIDATE,
      })
    ).toMatchObject({
      allowed: false,
      nextState: null,
      requireApproval: false,
    });
  });

  it('does not define an outgoing transition from VALIDATED', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.VALIDATED,
        action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
      })
    ).toMatchObject({
      allowed: false,
      nextState: null,
    });
  });

  it('does not define an outgoing transition from REJECTED', () => {
    expect(
      evaluateTransition({
        workflow: PAYMENT_NOTIFICATION_WORKFLOW,
        currentState: PaymentNotificationStatus.REJECTED,
        action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
      })
    ).toMatchObject({
      allowed: false,
      nextState: null,
    });
  });

  it('keeps the workflow definition immutable', () => {
    const originalDefinition = JSON.stringify(PAYMENT_NOTIFICATION_WORKFLOW);

    evaluateTransition({
      workflow: PAYMENT_NOTIFICATION_WORKFLOW,
      currentState: PaymentNotificationStatus.DRAFT,
      action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
    });

    expect(Object.isFrozen(PAYMENT_NOTIFICATION_ACTIONS)).toBe(true);
    expect(Object.isFrozen(PAYMENT_NOTIFICATION_PERMISSION_ACTIONS)).toBe(true);
    expect(Object.isFrozen(PAYMENT_NOTIFICATION_WORKFLOW)).toBe(true);
    expect(Object.isFrozen(PAYMENT_NOTIFICATION_WORKFLOW.states)).toBe(true);
    expect(Object.isFrozen(PAYMENT_NOTIFICATION_WORKFLOW.transitions)).toBe(
      true
    );
    expect(
      PAYMENT_NOTIFICATION_WORKFLOW.transitions.every((transition) =>
        Object.isFrozen(transition)
      )
    ).toBe(true);
    expect(JSON.stringify(PAYMENT_NOTIFICATION_WORKFLOW)).toBe(
      originalDefinition
    );
  });

  it('publishes stable permission actions without changing workflow actions', () => {
    expect(PAYMENT_NOTIFICATION_PERMISSION_ACTIONS).toMatchObject({
      CREATE_DRAFT: 'create_draft',
      UPDATE: 'update',
      SUBMIT: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
      START_REVIEW: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      VALIDATE: PAYMENT_NOTIFICATION_ACTIONS.VALIDATE,
      REJECT: PAYMENT_NOTIFICATION_ACTIONS.REJECT,
      REQUEST_CHANGES: PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
      RESUBMIT: PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
    });
  });
});
