export const APP_ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  QA: 'qa',
  PRODUCTION: 'production',
} as const;

export type AppEnvironment =
  (typeof APP_ENVIRONMENTS)[keyof typeof APP_ENVIRONMENTS];
