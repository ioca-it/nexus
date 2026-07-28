export type PermissionEffect = 'allow' | 'deny';

export interface Permission {
  readonly module: string;
  readonly action: string;
  readonly effect: PermissionEffect;
}

export interface PermissionRequest {
  readonly permissions: readonly Permission[];
  readonly module: string;
  readonly action: string;
}

export interface PermissionDecision {
  readonly allowed: boolean;
  readonly reason: string;
}
