import { createAuthClient } from "better-auth/react";
import { DEFAULT_LOGIN_REDIRECT } from "./config";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { ac, roles } from "./permissions";
import { CONFIG } from "@/config";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: CONFIG.apiEndpoint + "/auth",
  plugins: [adminClient({ ac, roles }), organizationClient()],
  user: {
    additionalFields: {
      walletAddress: { type: "string", required: false, unique: true },
    },
  },
});

export const signInWithGoogle = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: DEFAULT_LOGIN_REDIRECT,
  });
};

export const isAdmin = (role: string | null | undefined) => {
  return role === "admin";
};

export const isClient = (role: string | null | undefined) => {
  return ["client", "admin"].includes(role || "");
};

export const isUser = (role: string | null | undefined) => {
  return ["user", "client", "admin"].includes(role || "");
};
