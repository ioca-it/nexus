import type { ProcessDecision, ProcessRequest } from '../../engines/process';
import {
  createApplicationPipeline,
  executeApplicationPipeline,
} from './application-pipeline';

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

function createDecision(
  overrides: Partial<ProcessDecision> = {},
): ProcessDecision {
  return {
    allowed: true,
    valid: true,
    nextState: 'review',
    requireApproval: false,
    notificationsEnabled: true,
    reason: 'Process allowed',
    ...overrides,
  };
}

describe('application pipeline', () => {
  it('returns an allowed and valid process result', () => {
    const processRequest = createProcessRequest();

    expect(executeApplicationPipeline({ processRequest })).toMatchObject({
      allowed: true,
      valid: true,
    });
  });

  it('returns a denied process result without throwing', () => {
    const processDecision = createDecision({
      allowed: false,
      nextState: null,
      reason: 'Explicit deny',
    });
    const pipeline = createApplicationPipeline({
      evaluateProcess: () => processDecision,
    });

    expect(
      pipeline.execute({ processRequest: createProcessRequest() }),
    ).toMatchObject({
      allowed: false,
      valid: true,
      reason: 'Explicit deny',
    });
  });

  it('returns an invalid process result without throwing', () => {
    const processDecision = createDecision({
      allowed: false,
      valid: false,
      nextState: null,
      reason: 'Workflow definition not found',
    });
    const pipeline = createApplicationPipeline({
      evaluateProcess: () => processDecision,
    });

    expect(
      pipeline.execute({ processRequest: createProcessRequest() }),
    ).toMatchObject({
      allowed: false,
      valid: false,
      reason: 'Workflow definition not found',
    });
  });

  it.each([
    ['nextState', 'approved'],
    ['requireApproval', true],
    ['notificationsEnabled', false],
  ] as const)('propagates %s', (property, value) => {
    const processDecision = createDecision({ [property]: value });
    const pipeline = createApplicationPipeline({
      evaluateProcess: () => processDecision,
    });

    expect(
      pipeline.execute({ processRequest: createProcessRequest() })[property],
    ).toBe(value);
  });

  it('preserves the complete process decision by reference', () => {
    const processDecision = createDecision();
    const pipeline = createApplicationPipeline({
      evaluateProcess: () => processDecision,
    });

    const result = pipeline.execute({
      processRequest: createProcessRequest(),
    });

    expect(result.processDecision).toBe(processDecision);
  });

  it('executes the injected process evaluator exactly once', () => {
    const evaluateProcess = jest.fn(() => createDecision());
    const pipeline = createApplicationPipeline({ evaluateProcess });
    const processRequest = createProcessRequest();

    pipeline.execute({ processRequest });

    expect(evaluateProcess).toHaveBeenCalledTimes(1);
    expect(evaluateProcess).toHaveBeenCalledWith(processRequest);
  });

  it('uses the injected process evaluator result', () => {
    const processDecision = createDecision({
      nextState: 'approved',
      requireApproval: true,
    });
    const pipeline = createApplicationPipeline({
      evaluateProcess: () => processDecision,
    });

    expect(
      pipeline.execute({ processRequest: createProcessRequest() }),
    ).toEqual({
      ...processDecision,
      processDecision,
    });
  });

  it('does not modify its inputs', () => {
    const processRequest = createProcessRequest();
    const request = Object.freeze({ processRequest });
    const originalRequest = structuredClone(request);
    const pipeline = createApplicationPipeline({
      evaluateProcess: () => createDecision(),
    });

    pipeline.execute(request);

    expect(request).toEqual(originalRequest);
  });
});
