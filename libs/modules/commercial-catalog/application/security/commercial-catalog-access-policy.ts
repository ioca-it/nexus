import {
  evaluatePermission,
  type AuthenticatedActor,
  type PermissionDecision,
} from '@nexus/platform';

export const COMMERCIAL_CATALOG_PERMISSION_MODULE = 'commercial_catalog';

export const COMMERCIAL_CATALOG_PERMISSION_ACTIONS = Object.freeze({
  READ_CATALOG: 'read_catalog',
  READ_PRODUCT: 'read_product',
} as const);

export type CommercialCatalogPermissionAction =
  (typeof COMMERCIAL_CATALOG_PERMISSION_ACTIONS)[keyof typeof COMMERCIAL_CATALOG_PERMISSION_ACTIONS];

export interface CommercialCatalogAccessRequest {
  readonly actor: AuthenticatedActor;
  readonly action: CommercialCatalogPermissionAction;
}

export type CommercialCatalogAccessDecision = Readonly<PermissionDecision>;

export function evaluateCommercialCatalogAccess(
  request: CommercialCatalogAccessRequest,
): CommercialCatalogAccessDecision {
  const decision = evaluatePermission({
    permissions: request.actor.permissions,
    module: COMMERCIAL_CATALOG_PERMISSION_MODULE,
    action: request.action,
  });

  return Object.freeze({
    allowed: decision.allowed,
    reason: decision.reason,
  });
}
