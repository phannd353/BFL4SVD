import { CLIENT_HOST } from "@/lib/config";
import { MetadataRoute } from "next";
import { join } from "node:path";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["", "/projects", "/lien-he", "/blog"];
  const locale = "vi";

  const defaultRoutes = paths.map((path) =>
    genSitemap({
      path: `${path}`,
      locale,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  try {
    // const [{ data: posts }, { data: events }] = await Promise.all([
    //   getPublicPosts(),
    //   getEvents({ page: '1', limit: '100' }),
    // ]);

    return [...defaultRoutes].flat();
  } catch (e) {
    console.error("Error generating sitemap:", e);
    return defaultRoutes.flat();
  }
}

const genSitemap = ({
  locale,
  path,
  lastModified,
  changeFrequency,
  priority,
}: Omit<MetadataRoute.Sitemap[number], "url"> & {
  locale: string;
  path: string;
}) => ({
  url: join(CLIENT_HOST, path),
  lastModified,
  changeFrequency,
  priority,
});
