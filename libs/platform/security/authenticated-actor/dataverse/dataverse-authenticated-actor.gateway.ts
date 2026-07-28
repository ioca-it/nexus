import type { PermissionEffect } from '../../../engines/permissions';
import type {
  AuthenticatedActorPersistence,
  NexusApprovalGroupMemberRecord,
  NexusUserPermissionRecord,
  NexusUserRecord,
  NexusUserRoleRecord,
} from './authenticated-actor.persistence.types';
import type { AuthenticatedActorGateway } from './authenticated-actor.gateway';

type PhysicalRecord = Readonly<Record<string, unknown>>;

export interface DataverseQueryClient {
  query(
    entitySet: string,
    filter: PhysicalRecord,
  ): Promise<readonly PhysicalRecord[]>;
}

export interface DataverseAuthenticatedActorSchema {
  readonly user: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly active: string;
      readonly customerId: string;
    };
  };
  readonly role: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly role: string;
    };
  };
  readonly permission: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly module: string;
      readonly action: string;
      readonly effect: string;
    };
  };
  readonly approvalGroupMember: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly approvalGroupId: string;
    };
  };
}

function invalidRecord(recordType: string, field: string): never {
  throw new Error(
    `Invalid Dataverse ${recordType} record: missing or invalid field "${field}"`,
  );
}

function readString(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): string {
  const value = record[field];

  if (typeof value !== 'string' || value.length === 0) {
    return invalidRecord(recordType, field);
  }

  return value;
}

function readBoolean(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): boolean {
  const value = record[field];

  if (typeof value !== 'boolean') {
    return invalidRecord(recordType, field);
  }

  return value;
}

function readNullableString(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): string | null {
  const value = record[field];

  if (value === null) {
    return null;
  }

  return readString(record, field, recordType);
}

function readPermissionEffect(
  record: PhysicalRecord,
  field: string,
  recordType: string,
): PermissionEffect {
  const value = record[field];

  if (value !== 'allow' && value !== 'deny') {
    return invalidRecord(recordType, field);
  }

  return value;
}

export class DataverseAuthenticatedActorGateway
  implements AuthenticatedActorGateway
{
  private readonly client: DataverseQueryClient;
  private readonly schema: DataverseAuthenticatedActorSchema;

  constructor(dependencies: {
    readonly client: DataverseQueryClient;
    readonly schema: DataverseAuthenticatedActorSchema;
  }) {
    this.client = dependencies.client;
    this.schema = dependencies.schema;
  }

  async findByOid(oid: string): Promise<AuthenticatedActorPersistence | null> {
    const physicalUsers = await this.client.query(
      this.schema.user.entitySet,
      Object.freeze({
        [this.schema.user.fields.oid]: oid,
      }),
    );

    if (physicalUsers.length === 0) {
      return null;
    }

    if (physicalUsers.length > 1) {
      throw new Error('Dataverse returned multiple users for the same oid');
    }

    const user = this.toUserRecord(physicalUsers[0]);

    if (!user.active) {
      return null;
    }

    // Opti ChatGPT: carga agrupada y concurrente de roles, permisos y grupos para evitar consultas N+1.
    const [physicalRoles, physicalPermissions, physicalGroupMembers] =
      await Promise.all([
        this.client.query(
          this.schema.role.entitySet,
          Object.freeze({
            [this.schema.role.fields.oid]: oid,
          }),
        ),
        this.client.query(
          this.schema.permission.entitySet,
          Object.freeze({
            [this.schema.permission.fields.oid]: oid,
          }),
        ),
        this.client.query(
          this.schema.approvalGroupMember.entitySet,
          Object.freeze({
            [this.schema.approvalGroupMember.fields.oid]: oid,
          }),
        ),
      ]);

    return Object.freeze({
      user,
      roles: Object.freeze(
        physicalRoles.map((record) => this.toRoleRecord(record)),
      ),
      permissions: Object.freeze(
        physicalPermissions.map((record) => this.toPermissionRecord(record)),
      ),
      approvalGroupMembers: Object.freeze(
        physicalGroupMembers.map((record) =>
          this.toApprovalGroupMemberRecord(record),
        ),
      ),
    });
  }

  private toUserRecord(record: PhysicalRecord): NexusUserRecord {
    const fields = this.schema.user.fields;

    return Object.freeze({
      oid: readString(record, fields.oid, 'NexusUser'),
      active: readBoolean(record, fields.active, 'NexusUser'),
      customerId: readNullableString(record, fields.customerId, 'NexusUser'),
    });
  }

  private toRoleRecord(record: PhysicalRecord): NexusUserRoleRecord {
    const fields = this.schema.role.fields;

    return Object.freeze({
      oid: readString(record, fields.oid, 'NexusUserRole'),
      role: readString(record, fields.role, 'NexusUserRole'),
    });
  }

  private toPermissionRecord(
    record: PhysicalRecord,
  ): NexusUserPermissionRecord {
    const fields = this.schema.permission.fields;

    return Object.freeze({
      oid: readString(record, fields.oid, 'NexusUserPermission'),
      module: readString(record, fields.module, 'NexusUserPermission'),
      action: readString(record, fields.action, 'NexusUserPermission'),
      effect: readPermissionEffect(
        record,
        fields.effect,
        'NexusUserPermission',
      ),
    });
  }

  private toApprovalGroupMemberRecord(
    record: PhysicalRecord,
  ): NexusApprovalGroupMemberRecord {
    const fields = this.schema.approvalGroupMember.fields;

    return Object.freeze({
      oid: readString(record, fields.oid, 'NexusApprovalGroupMember'),
      approvalGroupId: readString(
        record,
        fields.approvalGroupId,
        'NexusApprovalGroupMember',
      ),
    });
  }
}
