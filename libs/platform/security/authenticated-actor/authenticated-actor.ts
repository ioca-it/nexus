import type { Permission } from '../../engines/permissions';
import type {
  AuthenticatedActor,
  CreateAuthenticatedActorInput,
} from './authenticated-actor.types';

function normalizeRequiredIdentifier(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalizedValue;
}

function copyIdentifiers(
  values: readonly string[],
  fieldName: string,
): readonly string[] {
  const copiedValues = values.map((value) => {
    if (value.trim().length === 0) {
      throw new Error(`${fieldName} must not contain empty values`);
    }

    return value;
  });

  return Object.freeze(copiedValues);
}

function copyPermissions(
  permissions: readonly Permission[],
): readonly Permission[] {
  return Object.freeze(
    permissions.map((permission) =>
      Object.freeze({
        module: permission.module,
        action: permission.action,
        effect: permission.effect,
      }),
    ),
  );
}

export function createAuthenticatedActor(
  input: CreateAuthenticatedActorInput,
): AuthenticatedActor {
  const userId = normalizeRequiredIdentifier(input.userId, 'userId');
  const customerId =
    input.customerId === null
      ? null
      : normalizeRequiredIdentifier(input.customerId, 'customerId');

  return Object.freeze({
    userId,
    customerId,
    roles: copyIdentifiers(input.roles, 'roles'),
    permissions: copyPermissions(input.permissions),
    approvalGroupIds: copyIdentifiers(
      input.approvalGroupIds,
      'approvalGroupIds',
    ),
  });
}
