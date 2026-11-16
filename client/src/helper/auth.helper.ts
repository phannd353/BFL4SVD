import { authClient } from '@/lib/auth-client';
import { cookies } from 'next/headers';
import 'server-only';

export const getAuthSession = async () => {
  const { data, error } = await authClient.getSession({
    fetchOptions: { headers: { Cookie: (await cookies()).toString() } },
  });

  return { user: data?.user || null, session: data?.session || null, error };
};
