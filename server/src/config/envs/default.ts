export const config = {
  port: process.env.NODE_PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  FLRegistryAddress:
    process.env.FL_REGISTRY_ADDRESS ||
    '0x0000000000000000000000000000000000000000',
  jsonRpcUrl: process.env.JSON_RPC_PROVIDER_URL || 'http://localhost:8545',
} as const;
