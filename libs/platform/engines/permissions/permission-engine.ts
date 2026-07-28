import type {
  PermissionDecision,
  PermissionRequest,
} from './permission.types';

const EXPLICIT_ALLOW_REASON = 'Explicit allow';
const EXPLICIT_DENY_REASON = 'Explicit deny';
const NO_APPLICABLE_PERMISSION_REASON = 'No applicable permission';

export function evaluatePermission(
  request: PermissionRequest
): PermissionDecision {
  let hasAllow = false;

  // Opti ChatGPT: una sola pasada evita recorridos redundantes y finaliza ante el primer deny aplicable.
  for (const permission of request.permissions) {
    if (
      permission.module !== request.module ||
      permission.action !== request.action
    ) {
      continue;
    }

    if (permission.effect === 'deny') {
      return {
        allowed: false,
        reason: EXPLICIT_DENY_REASON,
      };
    }

    hasAllow = true;
  }

  if (hasAllow) {
    return {
      allowed: true,
      reason: EXPLICIT_ALLOW_REASON,
    };
  }

  return {
    allowed: false,
    reason: NO_APPLICABLE_PERMISSION_REASON,
  };
}
