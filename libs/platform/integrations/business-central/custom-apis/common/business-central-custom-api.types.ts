export interface BusinessCentralCustomApiMetadata {
  readonly publisher: string;
  readonly group: string;
  readonly version: string;
  readonly entityName: string;
  readonly entitySetName: string;
}

function requireMetadataValue(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(
      `Business Central custom API metadata ${fieldName} is required`,
    );
  }

  return normalized;
}

export function createBusinessCentralCustomApiMetadata(
  metadata: BusinessCentralCustomApiMetadata,
): BusinessCentralCustomApiMetadata {
  return Object.freeze({
    publisher: requireMetadataValue(metadata.publisher, 'publisher'),
    group: requireMetadataValue(metadata.group, 'group'),
    version: requireMetadataValue(metadata.version, 'version'),
    entityName: requireMetadataValue(metadata.entityName, 'entityName'),
    entitySetName: requireMetadataValue(
      metadata.entitySetName,
      'entitySetName',
    ),
  });
}
