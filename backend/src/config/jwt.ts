export const jwtConfig = {
  accessSecret: process.env.JWT_SECRET ?? "dev-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
  accessExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
} as const;
