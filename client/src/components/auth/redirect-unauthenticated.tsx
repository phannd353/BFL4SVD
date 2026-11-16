"use client";

import { useAuth, useAuthenticate } from "@better-auth-ui/react";

export function RedirectUnauthenticated() {
  const { authClient } = useAuth();
  useAuthenticate(authClient);

  return null;
}
