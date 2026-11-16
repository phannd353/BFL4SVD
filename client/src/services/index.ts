"use server";

import { headers } from "next/headers";

import { CONFIG } from "../config";
import { tryRefreshSessionData } from "@/helper/cookie.helper";
import type { ApiResponseDto } from "@/types/api.dto";

export const retryFetcher = async <T = unknown>(
  url: string,
  options: RequestInit & {
    isPublicRoute?: boolean;
  } = {
    isPublicRoute: false,
  },
): Promise<ApiResponseDto<T>> => {
  let response;
  if (!options?.isPublicRoute) {
    const reqHeaders = new Headers(await headers());
    reqHeaders.delete("content-length"); // UND_ERR_REQ_CONTENT_LENGTH_MISMATCH
    reqHeaders.delete("content-type");

    await tryRefreshSessionData(reqHeaders);

    response = await fetch(CONFIG.apiEndpoint + url, {
      method: "GET",
      ...options,
      headers: {
        ...Object.fromEntries(reqHeaders.entries()),
        ...(options?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options?.headers,
      },
    }).catch((error) => {
      console.log("fetch error");
      console.error(error);

      throw new Response("Lỗi hệ thống", {
        status: 500,
      });
    });
  } else {
    response = await fetch(CONFIG.apiEndpoint + url, options).catch((error) => {
      console.log("fetch error");
      console.error(error);

      throw new Response("Lỗi hệ thống", {
        status: 500,
      });
    });
  }
  if (!response) {
    console.log("fetch error");
    console.error("No response");

    throw new Response("Lỗi hệ thống", {
      status: 500,
    });
  }

  let data: {
    data?: T;
    message?: string;
    statusCode?: number;
    timestamp?: string;
  };
  try {
    data = await response.json();
  } catch (error) {
    console.log("fetch error");
    console.error(error);
    throw new Response("Lỗi hệ thống", {
      status: response.ok ? 500 : response.status,
    });
  }

  const statusCode =
    typeof data.statusCode === "number" ? data.statusCode : response.status;
  if (!response.ok || statusCode >= 400) {
    console.log(
      "%s %s \x1b[31m%s\x1b[0m",
      options?.method || "GET",
      url,
      response.status,
    );
    throw new Response(data.message || "Lỗi hệ thống", {
      status: response.ok ? statusCode : response.status,
    });
  }

  console.log(
    "%s %s \x1b[32m%s\x1b[0m",
    options?.method || "GET",
    url,
    response.status,
  );
  return data as ApiResponseDto<T>;
};
