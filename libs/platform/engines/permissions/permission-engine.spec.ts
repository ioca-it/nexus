import { evaluatePermission } from './permission-engine';
import type { Permission } from './permission.types';

describe('evaluatePermission', () => {
  it('allows an explicit allow permission', () => {
    const permissions: readonly Permission[] = [
      { module: 'sales', action: 'read', effect: 'allow' },
    ];

    expect(
      evaluatePermission({ permissions, module: 'sales', action: 'read' })
    ).toEqual({
      allowed: true,
      reason: 'Explicit allow',
    });
  });

  it('denies an explicit deny permission', () => {
    const permissions: readonly Permission[] = [
      { module: 'sales', action: 'read', effect: 'deny' },
    ];

    expect(
      evaluatePermission({ permissions, module: 'sales', action: 'read' })
    ).toEqual({
      allowed: false,
      reason: 'Explicit deny',
    });
  });

  it('prioritizes deny when allow and deny permissions exist', () => {
    const permissions: readonly Permission[] = [
      { module: 'sales', action: 'read', effect: 'allow' },
      { module: 'sales', action: 'read', effect: 'deny' },
    ];

    expect(
      evaluatePermission({ permissions, module: 'sales', action: 'read' })
    ).toEqual({
      allowed: false,
      reason: 'Explicit deny',
    });
  });

  it('denies when no permission exists', () => {
    expect(
      evaluatePermission({
        permissions: [],
        module: 'sales',
        action: 'read',
      })
    ).toEqual({
      allowed: false,
      reason: 'No applicable permission',
    });
  });

  it('ignores permissions from another module', () => {
    const permissions: readonly Permission[] = [
      { module: 'inventory', action: 'read', effect: 'allow' },
    ];

    expect(
      evaluatePermission({ permissions, module: 'sales', action: 'read' })
    ).toEqual({
      allowed: false,
      reason: 'No applicable permission',
    });
  });

  it('ignores permissions for another action', () => {
    const permissions: readonly Permission[] = [
      { module: 'sales', action: 'write', effect: 'allow' },
    ];

    expect(
      evaluatePermission({ permissions, module: 'sales', action: 'read' })
    ).toEqual({
      allowed: false,
      reason: 'No applicable permission',
    });
  });

  it('does not modify the input collection', () => {
    const permissions: readonly Permission[] = [
      Object.freeze({ module: 'sales', action: 'read', effect: 'allow' }),
      Object.freeze({ module: 'inventory', action: 'write', effect: 'deny' }),
    ];
    Object.freeze(permissions);

    const originalPermissions = permissions.map((permission) => ({
      ...permission,
    }));

    evaluatePermission({ permissions, module: 'sales', action: 'read' });

    expect(permissions).toEqual(originalPermissions);
  });
});
