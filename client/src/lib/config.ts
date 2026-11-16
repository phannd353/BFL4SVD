import { join } from "node:path";

const CLIENT_HOST =
  process.env.NEXT_PUBLIC_CLIENT_HOST || "http://localhost:3000";
const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8080/api/v1";
const DEFAULT_LOGIN_REDIRECT = join(CLIENT_HOST, "/dashboard");

const AUTH_COOKIE_PREFIX = process.env.AUTH_COOKIE_PREFIX || "phannd-auth";

export {
  DEFAULT_LOGIN_REDIRECT,
  CLIENT_HOST,
  AUTH_COOKIE_PREFIX,
  API_ENDPOINT,
};
