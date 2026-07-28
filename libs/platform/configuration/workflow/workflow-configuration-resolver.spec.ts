import { resolveWorkflowConfiguration } from './workflow-configuration-resolver';
import type {
  WorkflowConfiguration,
  WorkflowEvent,
  WorkflowRoute,
} from './workflow-configuration.types';

const event: WorkflowEvent = {
  eventId: 'order.submitted',
  module: 'orders',
  action: 'submit',
};

const baseRoute: WorkflowRoute = {
  eventId: event.eventId,
  enabled: true,
  workflowId: 'order-approval',
  approvalGroupIds: ['operations'],
};

function createConfiguration(
  route: WorkflowRoute = baseRoute
): WorkflowConfiguration {
  return {
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
            requireApproval: true,
          },
        ],
      },
    ],
    routes: [route],
    approvalGroups: [
      {
        groupId: 'operations',
        approverIds: ['approver-1'],
      },
      {
        groupId: 'management',
        approverIds: ['approver-2', 'approver-3'],
      },
    ],
  };
}

describe('resolveWorkflowConfiguration', () => {
  it('resolves a valid configuration', () => {
    const configuration = createConfiguration();

    expect(resolveWorkflowConfiguration(configuration, event)).toEqual({
      enabled: true,
      workflow: configuration.workflows[0],
      approvalGroups: configuration.approvalGroups.slice(0, 1),
      valid: true,
      reason: 'Workflow configuration resolved',
    });
  });

  it('invalidates a missing route', () => {
    expect(
      resolveWorkflowConfiguration(createConfiguration(), {
        ...event,
        eventId: 'order.cancelled',
      })
    ).toEqual({
      enabled: false,
      workflow: null,
      approvalGroups: [],
      valid: false,
      reason: 'Workflow route not found',
    });
  });

  it('resolves a disabled route without an error', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      enabled: false,
      workflowId: 'missing-workflow',
      approvalGroupIds: ['missing-group'],
    });

    expect(resolveWorkflowConfiguration(configuration, event)).toEqual({
      enabled: false,
      workflow: null,
      approvalGroups: [],
      valid: true,
      reason: 'Workflow route disabled',
    });
  });

  it('invalidates a missing workflow', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      workflowId: 'missing-workflow',
    });

    expect(resolveWorkflowConfiguration(configuration, event)).toMatchObject({
      enabled: true,
      valid: false,
      reason: 'Workflow definition not found',
    });
  });

  it('invalidates a missing approval group', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      approvalGroupIds: ['missing-group'],
    });

    expect(resolveWorkflowConfiguration(configuration, event)).toMatchObject({
      enabled: true,
      valid: false,
      reason: 'Approval group not found',
    });
  });

  it('invalidates a group without valid approvers', () => {
    const configuration: WorkflowConfiguration = {
      ...createConfiguration(),
      approvalGroups: [
        {
          groupId: 'operations',
          approverIds: ['', '   '],
        },
      ],
    };

    expect(resolveWorkflowConfiguration(configuration, event)).toMatchObject({
      enabled: true,
      valid: false,
      reason: 'Approval group has no valid approvers',
    });
  });

  it('resolves multiple approval groups', () => {
    const configuration = createConfiguration({
      ...baseRoute,
      approvalGroupIds: ['operations', 'management'],
    });

    expect(
      resolveWorkflowConfiguration(configuration, event).approvalGroups
    ).toEqual(configuration.approvalGroups);
  });

  it('removes duplicate approvers within a group', () => {
    const configuration: WorkflowConfiguration = {
      ...createConfiguration(),
      approvalGroups: [
        {
          groupId: 'operations',
          approverIds: ['approver-1', 'approver-1', 'approver-2'],
        },
      ],
    };

    expect(
      resolveWorkflowConfiguration(configuration, event).approvalGroups
    ).toEqual([
      {
        groupId: 'operations',
        approverIds: ['approver-1', 'approver-2'],
      },
    ]);
  });

  it('does not modify its inputs', () => {
    const source = createConfiguration();
    const configuration: WorkflowConfiguration = Object.freeze({
      workflows: Object.freeze(
        source.workflows.map((workflow) =>
          Object.freeze({
            ...workflow,
            states: Object.freeze([...workflow.states]),
            transitions: Object.freeze(
              workflow.transitions.map((transition) =>
                Object.freeze({ ...transition })
              )
            ),
          })
        )
      ),
      routes: Object.freeze(
        source.routes.map((route) =>
          Object.freeze({
            ...route,
            approvalGroupIds: Object.freeze([...route.approvalGroupIds]),
          })
        )
      ),
      approvalGroups: Object.freeze(
        source.approvalGroups.map((group) =>
          Object.freeze({
            ...group,
            approverIds: Object.freeze([...group.approverIds]),
          })
        )
      ),
    });
    const immutableEvent = Object.freeze({ ...event });
    const originalConfiguration = createConfiguration();
    const originalEvent = { ...event };

    resolveWorkflowConfiguration(configuration, immutableEvent);

    expect(configuration).toEqual(originalConfiguration);
    expect(immutableEvent).toEqual(originalEvent);
  });
});
