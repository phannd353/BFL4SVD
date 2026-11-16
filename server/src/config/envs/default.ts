export const config = {
  betterAuth: {
    secret: process.env.BETTER_AUTH_SECRET || '',
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
    cookiePrefix: process.env.AUTH_COOKIE_PREFIX || 'bfl4svd-auth',
  },
  db: {
    url: process.env.DATABASE_URL || '',
    directUrl: process.env.DIRECT_DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  port: process.env.NODE_PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  FLRegistryAddress:
    process.env.FL_REGISTRY_ADDRESS ||
    '0x0000000000000000000000000000000000000000',
  jsonRpcUrl: process.env.JSON_RPC_URL || 'http://localhost:8545',
  blockchainPrivateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  flwrSuperlinkEndpoint:
    process.env.FLWR_SUPERLINK_ENDPOINT || '127.0.0.1:3000',
  flwrSuperlinkEnv: process.env.FLWR_SUPERLINK_ENV || 'development',
  // Secret the Flower ServerApp presents on its API callbacks. Supplied to the
  // ServerApp container environment; never part of the Flower run config.
  // Must be at least 32 characters, otherwise server callbacks are rejected.
  flwrServerToken: process.env.FLWR_SERVER_TOKEN || '',
  flwrSupernodeImage:
    process.env.FLWR_SUPERNODE_IMAGE || 'flwr/supernode:1.42.0',
  flwrSuperexecImage:
    process.env.FLWR_SUPEREXEC_IMAGE || 'bfl4svd-superexec:0.1.0',
  flwrAppPath: process.env.FLWR_APP_PATH || '/flwr',
  flwrBinPath: process.env.FLWR_BIN_PATH || 'flwr',
} as const;
