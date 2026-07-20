const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
};

const getOptionalEnv = (name: string, defaultValue = ''): string => {
  return process.env[name]?.trim() || defaultValue;
};

export const envLoader = {
  getRequired: getRequiredEnv,
  getOptional: getOptionalEnv,
};
