import { evaluateTransition } from './workflow-engine';
import type { Workflow } from './workflow.types';

const workflow: Workflow = {
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
    {
      fromState: 'review',
      toState: 'approved',
      action: 'approve',
      requireApproval: true,
    },
  ],
};

describe('evaluateTransition', () => {
  it('allows a defined transition', () => {
    expect(
      evaluateTransition({
        workflow,
        currentState: 'draft',
        action: 'submit',
      })
    ).toEqual({
      allowed: true,
      nextState: 'review',
      requireApproval: false,
      reason: 'Transition allowed',
    });
  });

  it('denies an undefined transition', () => {
    expect(
      evaluateTransition({
        workflow,
        currentState: 'review',
        action: 'submit',
      })
    ).toEqual({
      allowed: false,
      nextState: null,
      requireApproval: false,
      reason: 'Transition not defined',
    });
  });

  it('denies a transition from a nonexistent state', () => {
    expect(
      evaluateTransition({
        workflow,
        currentState: 'archived',
        action: 'submit',
      })
    ).toEqual({
      allowed: false,
      nextState: null,
      requireApproval: false,
      reason: 'Current state does not exist',
    });
  });

  it('denies a nonexistent action', () => {
    expect(
      evaluateTransition({
        workflow,
        currentState: 'draft',
        action: 'archive',
      })
    ).toEqual({
      allowed: false,
      nextState: null,
      requireApproval: false,
      reason: 'Transition not defined',
    });
  });

  it('returns approval as required for an approval transition', () => {
    expect(
      evaluateTransition({
        workflow,
        currentState: 'review',
        action: 'approve',
      })
    ).toEqual({
      allowed: true,
      nextState: 'approved',
      requireApproval: true,
      reason: 'Transition allowed',
    });
  });

  it('returns approval as not required for a direct transition', () => {
    expect(
      evaluateTransition({
        workflow,
        currentState: 'draft',
        action: 'submit',
      })
    ).toMatchObject({
      allowed: true,
      requireApproval: false,
    });
  });

  it('does not modify the workflow collections', () => {
    const immutableWorkflow: Workflow = Object.freeze({
      workflowId: workflow.workflowId,
      initialState: workflow.initialState,
      states: Object.freeze([...workflow.states]),
      transitions: Object.freeze(
        workflow.transitions.map((transition) =>
          Object.freeze({ ...transition })
        )
      ),
    });
    const originalWorkflow = {
      ...immutableWorkflow,
      states: [...immutableWorkflow.states],
      transitions: immutableWorkflow.transitions.map((transition) => ({
        ...transition,
      })),
    };

    evaluateTransition({
      workflow: immutableWorkflow,
      currentState: 'draft',
      action: 'submit',
    });

    expect(immutableWorkflow).toEqual(originalWorkflow);
  });
});
