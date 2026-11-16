'use client';

import { useAuth, useSession } from '@better-auth-ui/react';

export default function RedirectOnSignedIn({
  path,
  redirectPaths,
}: {
  path: string;
  redirectPaths: string[];
}) {
  const { navigate, redirectTo, authClient } = useAuth();
  const { data: session } = useSession(authClient);

  // If the path is not in the redirectPaths array, return null (no redirection)
  if (!redirectPaths.includes(path) || !session?.user) {
    return null;
  }

  // If the user is signed in, redirect to the specified path
  navigate({ to: redirectTo || '/', replace: true });
  return null;
}
