import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_CLIENT_HOST: z.url('NEXT_PUBLIC_CLIENT_HOST must be a valid URL'),
  NEXT_PUBLIC_API_ENDPOINT: z.url(
    'NEXT_PUBLIC_API_ENDPOINT must be a valid URL',
  ),
  AUTH_COOKIE_PREFIX: z.string().min(1, 'AUTH_COOKIE_PREFIX is required'),
  CLOUDINARY_URL: z.url({
    protocol: /cloudinary/,
    error: 'CLOUDINARY_URL must be a valid URL',
  }),
});

function validateEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_CLIENT_HOST: process.env.NEXT_PUBLIC_CLIENT_HOST,
    NEXT_PUBLIC_API_ENDPOINT: process.env.NEXT_PUBLIC_API_ENDPOINT,
    AUTH_COOKIE_PREFIX: process.env.AUTH_COOKIE_PREFIX,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  });

  if (!parsed.success) {
    console.error(
      'Invalid environment variables:',
      z.treeifyError(parsed.error),
    );
    throw new Error('Invalid environment variables. Check your .env file.');
  }

  return parsed.data;
}

export const env = validateEnv();
