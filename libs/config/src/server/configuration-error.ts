export class ConfigurationError extends Error {
  readonly missingVariables: readonly string[];

  constructor(missingVariables: readonly string[]) {
    super(
      `Missing required environment variables: ${missingVariables.join(', ')}`
    );
    this.name = 'ConfigurationError';
    this.missingVariables = [...missingVariables];
  }
}
