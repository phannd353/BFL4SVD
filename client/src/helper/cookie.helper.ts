"use server";

import { cookies } from "next/headers";
import { Cookie, parse } from "set-cookie-parser";

import { AUTH_COOKIE_PREFIX } from "@/lib/config";
import { CONFIG } from "../config";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

async function parseSessionData(
  cookieStr: string,
): Promise<Cookie | Cookie[] | null> {
  const sessionDataCookieKey = `${AUTH_COOKIE_PREFIX}.session_data`;

  const cookies = parse(cookieStr, { map: true });

  const sessionDataCookie = cookies[sessionDataCookieKey];

  if (sessionDataCookie) {
    return sessionDataCookie;
  }

  const tokenParts: Cookie[] = [];
  let index = 0;
  while (true) {
    const part = cookies[`${sessionDataCookieKey}.${index}`];
    if (!part) {
      break;
    }
    tokenParts.push(part);
    index++;

    if (index > 10) {
      console.error("Too many parts for session data cookie");
      break;
    }
  }

  return tokenParts.length > 0 ? tokenParts : null;
}

async function trySetSessionDataCookie(
  reqHeaders: Headers,
  store: ReadonlyRequestCookies,
  cookie: Cookie,
) {
  try {
    const { name, value, ...options } = cookie;
    store.set(name, value, options as any);
    reqHeaders.set("Cookie", store.toString());
  } catch (error) {
    console.error("Error setting refreshed session cookie:", error);
  }
}

async function tryRefreshSessionData(reqHeaders: Headers) {
  const store = await cookies();
  const sessionToken = store.get(`${AUTH_COOKIE_PREFIX}.session_token`);
  const sessionData = await parseSessionData(store.toString());

  // If session token and session data are present, no need to refresh
  if (sessionToken && sessionData) {
    return null;
  }

  // Check if user is authenticated but JWT is expired
  // If user is not authenticated yet, just continue fetching and throw error if any
  // Refresh session data with sesion token
  const res = await fetch(CONFIG.apiEndpoint + "/auth/get-session", {
    headers: { Cookie: store.toString() },
  });

  const newSessionDataCookie = await parseSessionData(
    res.headers.get("set-cookie") || "",
  );
  if (!newSessionDataCookie) {
    return;
  }

  if (Array.isArray(newSessionDataCookie)) {
    for (const cookie of newSessionDataCookie) {
      await trySetSessionDataCookie(reqHeaders, store, cookie);
    }
  } else {
    await trySetSessionDataCookie(reqHeaders, store, newSessionDataCookie);
  }
}

export { parseSessionData, tryRefreshSessionData, trySetSessionDataCookie };
