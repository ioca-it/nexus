import type { NexusConfig } from '../types/config.types';
import { loadAppConfig } from '../loaders/app-config';
import { validateRequiredEnvironmentVariables } from '../validators/env-validator';

let cachedConfig: NexusConfig | null = null;

export const getAppConfig = (): NexusConfig => {
  if (!cachedConfig) {
    validateRequiredEnvironmentVariables();
    cachedConfig = loadAppConfig();
  }

  return cachedConfig;
};
