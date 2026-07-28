import { evaluateProcess } from './process-engine';
import type { ProcessActorContext, ProcessRequest } from './process.types';

function createProcessRequest(): ProcessRequest {
  return {
    permissionRequest: {
      permissions: [
        {
          module: 'orders',
          action: 'submit',
          effect: 'allow',
        },
      ],
      module: 'orders',
      action: 'submit',
    },
    workflowConfiguration: {
      workflows: [
        {
          workflowId: 'order-approval',
          initialState: 'draft',
          states: ['draft', 'review', 'approved'],
          transitions: [
            {
              fromState: 'draft',
              toState: 'review',
              action: 'submit',
              requireApproval: false,
            },
          ],
        },
      ],
      routes: [
        {
          eventId: 'order.submitted',
          enabled: true,
          workflowId: 'order-approval',
          approvalGroupIds: ['operations'],
        },
      ],
      approvalGroups: [
        {
          groupId: 'operations',
          approverIds: ['approver-1'],
        },
      ],
    },
    workflowEvent: {
      eventId: 'order.submitted',
      module: 'orders',
      action: 'submit',
    },
    currentState: 'draft',
    action: 'submit',
    notificationConfiguration: {
      templates: [
        {
          templateId: 'order-email',
          channel: 'email',
          subject: 'Order submitted',
          body: 'Order {{orderId}} was submitted.',
        },
      ],
      routes: [
        {
          eventId: 'order.transitioned',
          enabled: true,
          channels: ['email'],
          templateIds: ['order-email'],
          recipientGroups: ['operations'],
        },
      ],
      recipientGroups: [
        {
          groupId: 'operations',
          recipients: [
            {
              recipientId: 'user-1',
              address: 'user@example.com',
            },
          ],
        },
      ],
    },
    notificationEvent: {
      eventId: 'order.transitioned',
      module: 'orders',
      action: 'submit',
    },
  };
}

function createApprovalProcessRequest(): ProcessRequest {
  const request = createProcessRequest();
  const workflow = request.workflowConfiguration.workflows[0];

  return {
    ...request,
    workflowConfiguration: {
      ...request.workflowConfiguration,
      workflows: [
        {
          ...workflow,
          transitions: workflow.transitions.map((transition) => ({
            ...transition,
            requireApproval: true,
          })),
        },
      ],
    },
    actorContext: {
      userId: 'approver-1',
      approvalGroupIds: ['operations'],
    },
  };
}

function getActorContext(request: ProcessRequest): ProcessActorContext {
  if (!request.actorContext) {
    throw new Error('Expected actor context in approval test request.');
  }

  return request.actorContext;
}

describe('evaluateProcess', () => {
  it('evaluates a complete valid process', () => {
    expect(evaluateProcess(createProcessRequest())).toEqual({
      allowed: true,
      nextState: 'review',
      requireApproval: false,
      notificationsEnabled: true,
      valid: true,
      reason: 'Process allowed',
    });
  });

  it('stops when permission is denied', () => {
    const request: ProcessRequest = {
      ...createProcessRequest(),
      permissionRequest: {
        permissions: [
          {
            module: 'orders',
            action: 'submit',
            effect: 'deny',
          },
        ],
        module: 'orders',
        action: 'submit',
      },
      workflowConfiguration: {
        workflows: [],
        routes: [],
        approvalGroups: [],
      },
    };

    expect(evaluateProcess(request)).toEqual({
      allowed: false,
      nextState: null,
      requireApproval: false,
      notificationsEnabled: false,
      valid: true,
      reason: 'Explicit deny',
    });
  });

  it('stops when the workflow does not exist', () => {
    const baseRequest = createProcessRequest();
    const request: ProcessRequest = {
      ...baseRequest,
      workflowConfiguration: {
        ...baseRequest.workflowConfiguration,
        routes: [
          {
            ...baseRequest.workflowConfiguration.routes[0],
            workflowId: 'missing-workflow',
          },
        ],
      },
    };

    expect(evaluateProcess(request)).toMatchObject({
      allowed: false,
      nextState: null,
      notificationsEnabled: false,
      valid: false,
      reason: 'Workflow definition not found',
    });
  });

  it('stops when the transition is invalid', () => {
    const baseRequest = createProcessRequest();
    const request: ProcessRequest = {
      ...baseRequest,
      permissionRequest: {
        permissions: [
          {
            module: 'orders',
            action: 'archive',
            effect: 'allow',
          },
        ],
        module: 'orders',
        action: 'archive',
      },
      action: 'archive',
      notificationConfiguration: {
        ...baseRequest.notificationConfiguration,
        routes: [],
      },
    };

    expect(evaluateProcess(request)).toMatchObject({
      allowed: false,
      nextState: null,
      notificationsEnabled: false,
      valid: true,
      reason: 'Transition not defined',
    });
  });

  it('allows a process with notifications disabled', () => {
    const baseRequest = createProcessRequest();
    const request: ProcessRequest = {
      ...baseRequest,
      notificationConfiguration: {
        ...baseRequest.notificationConfiguration,
        routes: baseRequest.notificationConfiguration.routes.map((route) => ({
          ...route,
          enabled: false,
        })),
      },
    };

    expect(evaluateProcess(request)).toMatchObject({
      allowed: true,
      nextState: 'review',
      notificationsEnabled: false,
      valid: true,
      reason: 'Process allowed',
    });
  });

  it('propagates an approval requirement', () => {
    const request = createApprovalProcessRequest();

    expect(evaluateProcess(request)).toMatchObject({
      allowed: true,
      requireApproval: true,
      valid: true,
    });
  });

  it('allows a non-approval transition without actor context', () => {
    expect(evaluateProcess(createProcessRequest())).toMatchObject({
      allowed: true,
      requireApproval: false,
    });
  });

  it('allows approval when the actor belongs to a required group', () => {
    expect(evaluateProcess(createApprovalProcessRequest())).toMatchObject({
      allowed: true,
      requireApproval: true,
      reason: 'Process allowed',
    });
  });

  it('denies approval without actor context', () => {
    const request: ProcessRequest = {
      ...createApprovalProcessRequest(),
      actorContext: undefined,
    };

    expect(evaluateProcess(request)).toMatchObject({
      allowed: false,
      requireApproval: true,
      notificationsEnabled: false,
      valid: true,
      reason: 'Actor context is required for approval',
    });
  });

  it('denies approval when no approval groups are configured for the route', () => {
    const request = createApprovalProcessRequest();

    expect(
      evaluateProcess({
        ...request,
        workflowConfiguration: {
          ...request.workflowConfiguration,
          routes: request.workflowConfiguration.routes.map((route) => ({
            ...route,
            approvalGroupIds: [],
          })),
        },
      }),
    ).toMatchObject({
      allowed: false,
      requireApproval: true,
      notificationsEnabled: false,
      valid: false,
      reason: 'Approval groups are not configured',
    });
  });

  it('denies approval when the actor has no approval groups', () => {
    const request = createApprovalProcessRequest();

    expect(
      evaluateProcess({
        ...request,
        actorContext: {
          ...getActorContext(request),
          approvalGroupIds: [],
        },
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'Actor is not a member of a required approval group',
    });
  });

  it('denies approval when the actor belongs to a different group', () => {
    const request = createApprovalProcessRequest();

    expect(
      evaluateProcess({
        ...request,
        actorContext: {
          ...getActorContext(request),
          approvalGroupIds: ['management'],
        },
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'Actor is not a member of a required approval group',
    });
  });

  it('uses exact group identifiers', () => {
    const request = createApprovalProcessRequest();

    expect(
      evaluateProcess({
        ...request,
        actorContext: {
          ...getActorContext(request),
          approvalGroupIds: [' Operations '],
        },
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'Actor is not a member of a required approval group',
    });
  });

  it('allows approval when the actor belongs to one of several required groups', () => {
    const request = createApprovalProcessRequest();

    expect(
      evaluateProcess({
        ...request,
        workflowConfiguration: {
          ...request.workflowConfiguration,
          routes: request.workflowConfiguration.routes.map((route) => ({
            ...route,
            approvalGroupIds: ['operations', 'management'],
          })),
          approvalGroups: [
            ...request.workflowConfiguration.approvalGroups,
            {
              groupId: 'management',
              approverIds: ['approver-2'],
            },
          ],
        },
        actorContext: {
          userId: 'approver-2',
          approvalGroupIds: ['management'],
        },
      }),
    ).toMatchObject({
      allowed: true,
      requireApproval: true,
    });
  });

  it('does not use roles or Nexus.Admin as an approval bypass', () => {
    const request = createApprovalProcessRequest();
    const actorContextWithRoles = {
      userId: 'admin-1',
      approvalGroupIds: [],
      roles: ['Nexus.Admin'],
    };

    expect(
      evaluateProcess({
        ...request,
        actorContext: actorContextWithRoles,
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'Actor is not a member of a required approval group',
    });
  });

  it('does not resolve notifications when approval fails', () => {
    const request = createApprovalProcessRequest();
    const notificationConfiguration = {
      get templates(): never {
        throw new Error('notifications must not be resolved');
      },
      get routes(): never {
        throw new Error('notifications must not be resolved');
      },
      get recipientGroups(): never {
        throw new Error('notifications must not be resolved');
      },
    };

    expect(
      evaluateProcess({
        ...request,
        actorContext: {
          ...getActorContext(request),
          approvalGroupIds: [],
        },
        notificationConfiguration,
      }),
    ).toMatchObject({
      allowed: false,
      notificationsEnabled: false,
      reason: 'Actor is not a member of a required approval group',
    });
  });

  it('does not modify its inputs', () => {
    const source = createApprovalProcessRequest();
    const request = Object.freeze({
      ...source,
      actorContext: Object.freeze({
        ...getActorContext(source),
        approvalGroupIds: Object.freeze([
          ...getActorContext(source).approvalGroupIds,
        ]),
      }),
    });
    const originalRequest = structuredClone(request);

    evaluateProcess(request);

    expect(request).toEqual(originalRequest);
  });
});
