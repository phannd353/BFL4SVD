export const config = {
  betterAuth: {
    secret: process.env.BETTER_AUTH_SECRET || '',
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
    cookiePrefix: process.env.AUTH_COOKIE_PREFIX || 'phannd-auth',
  },
  db: {
    url: process.env.DATABASE_URL || '',
    directUrl: process.env.DIRECT_DATABASE_URL || '',
  },
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  port: process.env.NODE_PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  FLRegistryAddress:
    process.env.FL_REGISTRY_ADDRESS ||
    '0x0000000000000000000000000000000000000000',
  jsonRpcUrl: process.env.JSON_RPC_PROVIDER_URL || 'http://localhost:8545',
} as const;
