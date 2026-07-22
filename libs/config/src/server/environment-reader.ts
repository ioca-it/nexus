import type { EnvironmentVariables } from '../shared/environment-variables';

export const readEnvironmentVariable = (
  name: string,
  environment: EnvironmentVariables = process.env
): string | undefined => {
  const value = environment[name]?.trim();

  return value || undefined;
};
