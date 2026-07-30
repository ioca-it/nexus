import type { AuthenticatedActor, Permission } from '@nexus/platform';
import {
  COMMERCIAL_CATALOG_PERMISSION_ACTIONS,
  COMMERCIAL_CATALOG_PERMISSION_MODULE,
  evaluateCommercialCatalogAccess,
} from './commercial-catalog-access-policy';

function actor(
  permissions: readonly Permission[],
  roles: readonly string[] = [],
): AuthenticatedActor {
  return Object.freeze({
    userId: 'user-1',
    customerId: 'customer-1',
    roles: Object.freeze([...roles]),
    permissions: Object.freeze([...permissions]),
    approvalGroupIds: Object.freeze([]),
  });
}

describe('evaluateCommercialCatalogAccess', () => {
  const allowReadCatalog = Object.freeze({
    module: COMMERCIAL_CATALOG_PERMISSION_MODULE,
    action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_CATALOG,
    effect: 'allow' as const,
  });

  it('allows an explicit permission and freezes the decision', () => {
    const decision = evaluateCommercialCatalogAccess({
      actor: actor([allowReadCatalog]),
      action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_CATALOG,
    });

    expect(decision.allowed).toBe(true);
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it('applies default denial', () => {
    expect(
      evaluateCommercialCatalogAccess({
        actor: actor([]),
        action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_PRODUCT,
      }).allowed,
    ).toBe(false);
  });

  it('gives deny precedence over allow', () => {
    const decision = evaluateCommercialCatalogAccess({
      actor: actor([allowReadCatalog, { ...allowReadCatalog, effect: 'deny' }]),
      action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_CATALOG,
    });

    expect(decision.allowed).toBe(false);
  });

  it('does not treat Nexus.Admin as a bypass', () => {
    expect(
      evaluateCommercialCatalogAccess({
        actor: actor([], ['Nexus.Admin']),
        action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_PRODUCT,
      }).allowed,
    ).toBe(false);
  });

  it('does not use or modify roles', () => {
    const withoutRoles = evaluateCommercialCatalogAccess({
      actor: actor([allowReadCatalog]),
      action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_CATALOG,
    });
    const withRoles = evaluateCommercialCatalogAccess({
      actor: actor([allowReadCatalog], ['Catalog.Reader', 'Nexus.Admin']),
      action: COMMERCIAL_CATALOG_PERMISSION_ACTIONS.READ_CATALOG,
    });

    expect(withRoles).toEqual(withoutRoles);
  });
});
