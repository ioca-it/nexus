import type { PermissionEffect } from '../../../engines/permissions';

export interface NexusUserRecord {
  readonly oid: string;
  readonly active: boolean;
  readonly customerId: string | null;
}

export interface NexusUserRoleRecord {
  readonly oid: string;
  readonly role: string;
}

export interface NexusUserPermissionRecord {
  readonly oid: string;
  readonly module: string;
  readonly action: string;
  readonly effect: PermissionEffect;
}

export interface NexusApprovalGroupMemberRecord {
  readonly oid: string;
  readonly approvalGroupId: string;
}

export interface AuthenticatedActorPersistence {
  readonly user: NexusUserRecord;
  readonly roles: readonly NexusUserRoleRecord[];
  readonly permissions: readonly NexusUserPermissionRecord[];
  readonly approvalGroupMembers: readonly NexusApprovalGroupMemberRecord[];
}
