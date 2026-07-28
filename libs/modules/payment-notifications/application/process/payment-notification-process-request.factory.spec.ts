import {
  createAuthenticatedActor,
  evaluateProcess,
  type AuthenticatedActor,
  type Permission,
} from '@nexus/platform';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PaymentNotificationStatus } from '../../domain/payment-notification.types';
import { PAYMENT_NOTIFICATION_ACTIONS } from '../payment-notification-workflow';
import {
  createPaymentNotificationProcessRequest,
  normalizePaymentNotificationApprovalGroupIds,
} from './payment-notification-process-request.factory';

function createActor(
  permissions: readonly Permission[],
  approvalGroupIds: readonly string[] = [],
  roles: readonly string[] = [],
): AuthenticatedActor {
  return createAuthenticatedActor({
    userId: 'actor-1',
    customerId: 'customer-1',
    permissions,
    approvalGroupIds,
    roles,
  });
}

const allow = (action: string): Permission => ({
  module: 'payment-notifications',
  action,
  effect: 'allow',
});

describe('createPaymentNotificationProcessRequest', () => {
  it('uses actor permissions and actor context without artificial permissions', () => {
    const actor = createActor(
      [allow(PAYMENT_NOTIFICATION_ACTIONS.SUBMIT)],
      ['GROUP-A'],
    );
    const request = createPaymentNotificationProcessRequest({
      actor,
      currentState: PaymentNotificationStatus.DRAFT,
      action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
    });

    expect(request.permissionRequest.permissions).toBe(actor.permissions);
    expect(request.actorContext).toEqual({
      userId: actor.userId,
      approvalGroupIds: actor.approvalGroupIds,
    });
    expect(request.actorContext?.approvalGroupIds).toBe(actor.approvalGroupIds);
  });

  it('allows a non-approval transition with an explicit permission', () => {
    const request = createPaymentNotificationProcessRequest({
      actor: createActor([allow(PAYMENT_NOTIFICATION_ACTIONS.SUBMIT)]),
      currentState: PaymentNotificationStatus.DRAFT,
      action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
    });

    expect(evaluateProcess(request)).toMatchObject({
      allowed: true,
      requireApproval: false,
      nextState: PaymentNotificationStatus.SUBMITTED,
    });
    expect(request.workflowConfiguration.routes[0].approvalGroupIds).toEqual(
      [],
    );
  });

  it('denies by default when the actor has no applicable permission', () => {
    const request = createPaymentNotificationProcessRequest({
      actor: createActor([]),
      currentState: PaymentNotificationStatus.DRAFT,
      action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
    });

    expect(evaluateProcess(request)).toMatchObject({
      allowed: false,
      reason: 'No applicable permission',
    });
  });

  it('gives explicit deny precedence over allow', () => {
    const request = createPaymentNotificationProcessRequest({
      actor: createActor([
        allow(PAYMENT_NOTIFICATION_ACTIONS.SUBMIT),
        {
          module: 'payment-notifications',
          action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
          effect: 'deny',
        },
      ]),
      currentState: PaymentNotificationStatus.DRAFT,
      action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
    });

    expect(evaluateProcess(request)).toMatchObject({
      allowed: false,
      reason: 'Explicit deny',
    });
  });

  it('does not grant access from Nexus.Admin without an explicit permission', () => {
    const request = createPaymentNotificationProcessRequest({
      actor: createActor([], ['GROUP-A'], ['Nexus.Admin']),
      currentState: PaymentNotificationStatus.DRAFT,
      action: PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
    });

    expect(evaluateProcess(request).allowed).toBe(false);
  });

  it('allows approval with an explicit permission and one matching group', () => {
    const request = createPaymentNotificationProcessRequest({
      actor: createActor(
        [allow(PAYMENT_NOTIFICATION_ACTIONS.VALIDATE)],
        ['GROUP-B'],
      ),
      currentState: PaymentNotificationStatus.UNDER_REVIEW,
      action: PAYMENT_NOTIFICATION_ACTIONS.VALIDATE,
      approvalGroupIds: ['GROUP-A', 'GROUP-B'],
    });

    expect(evaluateProcess(request)).toMatchObject({
      allowed: true,
      requireApproval: true,
      nextState: PaymentNotificationStatus.VALIDATED,
    });
    expect(
      request.workflowConfiguration.approvalGroups.map(
        (group) => group.groupId,
      ),
    ).toEqual(['GROUP-A', 'GROUP-B']);
  });

  it('denies approval without a matching group', () => {
    const request = createPaymentNotificationProcessRequest({
      actor: createActor(
        [allow(PAYMENT_NOTIFICATION_ACTIONS.REJECT)],
        ['GROUP-C'],
      ),
      currentState: PaymentNotificationStatus.UNDER_REVIEW,
      action: PAYMENT_NOTIFICATION_ACTIONS.REJECT,
      approvalGroupIds: ['GROUP-A'],
    });

    expect(evaluateProcess(request)).toMatchObject({
      allowed: false,
      reason: 'Actor is not a member of a required approval group',
    });
  });

  it('denies approval when a matching group has no explicit permission', () => {
    const request = createPaymentNotificationProcessRequest({
      actor: createActor([], ['GROUP-A']),
      currentState: PaymentNotificationStatus.UNDER_REVIEW,
      action: PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
      approvalGroupIds: ['GROUP-A'],
    });

    expect(evaluateProcess(request)).toMatchObject({
      allowed: false,
      reason: 'No applicable permission',
    });
  });

  it('does not modify actor or input collections and freezes its output', () => {
    const actor = createActor(
      [allow(PAYMENT_NOTIFICATION_ACTIONS.VALIDATE)],
      ['GROUP-A'],
    );
    const approvalGroupIds = Object.freeze(['GROUP-A']);
    const originalActor = structuredClone(actor);

    const request = createPaymentNotificationProcessRequest({
      actor,
      currentState: PaymentNotificationStatus.UNDER_REVIEW,
      action: PAYMENT_NOTIFICATION_ACTIONS.VALIDATE,
      approvalGroupIds,
    });

    expect(actor).toEqual(originalActor);
    expect(approvalGroupIds).toEqual(['GROUP-A']);
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.workflowConfiguration)).toBe(true);
    expect(Object.isFrozen(request.workflowConfiguration.approvalGroups)).toBe(
      true,
    );
  });

  it('normalizes, deduplicates and copies configured groups', () => {
    const approvalGroupIds = Object.freeze([' GROUP-B ', 'GROUP-A', 'GROUP-B']);

    const normalized =
      normalizePaymentNotificationApprovalGroupIds(approvalGroupIds);

    expect(normalized).toEqual(['GROUP-B', 'GROUP-A']);
    expect(normalized).not.toBe(approvalGroupIds);
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(approvalGroupIds).toEqual([' GROUP-B ', 'GROUP-A', 'GROUP-B']);
  });

  for (const approvalGroupIds of [[], [''], ['   '], ['GROUP-A', ' ']]) {
    it(`rejects invalid approval group configuration: ${JSON.stringify(
      approvalGroupIds,
    )}`, () => {
      expect(() =>
        normalizePaymentNotificationApprovalGroupIds(approvalGroupIds),
      ).toThrow(/approval group/i);
    });
  }

  it('contains no constant allow permission in production use cases', () => {
    const useCaseSources = [
      'submit/submit-payment-notification.use-case.ts',
      'start-review/start-review-payment-notification.use-case.ts',
      'validate/validate-payment-notification.use-case.ts',
      'reject/reject-payment-notification.use-case.ts',
      'request-changes/request-changes-payment-notification.use-case.ts',
      'resubmit/resubmit-payment-notification.use-case.ts',
    ]
      .map((path) =>
        readFileSync(join(__dirname, '..', 'use-cases', path), 'utf8'),
      )
      .join('\n');

    expect(useCaseSources).not.toMatch(/effect\s*:\s*['"]allow['"]/);
  });
});
