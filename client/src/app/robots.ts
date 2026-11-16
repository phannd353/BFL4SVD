import type { MetadataRoute } from "next";
import { join } from "node:path";
import { CLIENT_HOST } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/auth", "/api", "/cmsdesk"],
    },
    sitemap: join(CLIENT_HOST, "/sitemap.xml"),
  };
}
