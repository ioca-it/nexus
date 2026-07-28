import type { ProcessDecision, ProcessRequest } from '../../engines/process';
import type { ApplicationPipelineResult } from '../pipeline';
import { createStateTransition } from './state-transition';

interface TestEntity {
  readonly id: string;
  readonly status: string;
}

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
          states: ['draft', 'review'],
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
          approvalGroupIds: [],
        },
      ],
      approvalGroups: [],
    },
    workflowEvent: {
      eventId: 'order.submitted',
      module: 'orders',
      action: 'submit',
    },
    currentState: 'draft',
    action: 'submit',
    notificationConfiguration: {
      templates: [],
      routes: [
        {
          eventId: 'order.transitioned',
          enabled: true,
          channels: [],
          templateIds: [],
          recipientGroups: [],
        },
      ],
      recipientGroups: [],
    },
    notificationEvent: {
      eventId: 'order.transitioned',
      module: 'orders',
      action: 'submit',
    },
  };
}

function createPipelineResult(
  overrides: Partial<ProcessDecision> = {},
): ApplicationPipelineResult {
  const processDecision: ProcessDecision = {
    allowed: true,
    valid: true,
    nextState: 'review',
    requireApproval: false,
    notificationsEnabled: true,
    reason: 'Process allowed',
    ...overrides,
  };

  return {
    ...processDecision,
    processDecision,
  };
}

function createContext() {
  return {
    entity: Object.freeze<TestEntity>({
      id: 'entity-1',
      status: 'draft',
    }),
    processRequest: createProcessRequest(),
  };
}

describe('state transition', () => {
  it('executes an allowed transition with the default pipeline', () => {
    const context = createContext();

    const result = createStateTransition<TestEntity>().execute(context);

    expect(result.pipelineResult).toMatchObject({
      allowed: true,
      valid: true,
      nextState: 'review',
    });
  });

  it('returns a denied pipeline result without throwing', () => {
    const pipelineResult = createPipelineResult({
      allowed: false,
      nextState: null,
      reason: 'Explicit deny',
    });
    const transition = createStateTransition<TestEntity>({
      executePipeline: () => pipelineResult,
    });

    expect(transition.execute(createContext()).pipelineResult).toBe(
      pipelineResult,
    );
  });

  it('returns an invalid pipeline result without throwing', () => {
    const pipelineResult = createPipelineResult({
      allowed: false,
      valid: false,
      nextState: null,
      reason: 'Workflow definition not found',
    });
    const transition = createStateTransition<TestEntity>({
      executePipeline: () => pipelineResult,
    });

    expect(transition.execute(createContext()).pipelineResult).toBe(
      pipelineResult,
    );
  });

  it('executes the pipeline exactly once', () => {
    const pipelineResult = createPipelineResult();
    const executePipeline = jest.fn(() => pipelineResult);
    const transition = createStateTransition<TestEntity>({ executePipeline });
    const context = createContext();

    transition.execute(context);

    expect(executePipeline).toHaveBeenCalledTimes(1);
    expect(executePipeline).toHaveBeenCalledWith({
      processRequest: context.processRequest,
    });
  });

  it('preserves the entity reference', () => {
    const context = createContext();
    const transition = createStateTransition<TestEntity>({
      executePipeline: () => createPipelineResult(),
    });

    expect(transition.execute(context).entity).toBe(context.entity);
  });

  it('preserves the complete pipeline result by reference', () => {
    const pipelineResult = createPipelineResult();
    const transition = createStateTransition<TestEntity>({
      executePipeline: () => pipelineResult,
    });

    expect(transition.execute(createContext()).pipelineResult).toBe(
      pipelineResult,
    );
  });

  it('uses the injected pipeline dependency', () => {
    const pipelineResult = createPipelineResult({
      nextState: 'approved',
      requireApproval: true,
      notificationsEnabled: false,
    });
    const transition = createStateTransition<TestEntity>({
      executePipeline: () => pipelineResult,
    });

    expect(transition.execute(createContext())).toEqual({
      entity: createContext().entity,
      pipelineResult,
    });
  });

  it('does not modify its inputs', () => {
    const source = createContext();
    const context = Object.freeze({
      entity: source.entity,
      processRequest: Object.freeze(source.processRequest),
    });
    const originalContext = structuredClone(context);
    const transition = createStateTransition<TestEntity>({
      executePipeline: () => createPipelineResult(),
    });

    transition.execute(context);

    expect(context).toEqual(originalContext);
  });
});
