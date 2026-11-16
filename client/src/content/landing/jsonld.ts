import { CLIENT_HOST } from "@/lib/config";
import { getMetadata } from "./metadata";

function genJsonLd({
  metadata,
  locale,
}: {
  metadata: Awaited<ReturnType<typeof getMetadata>>;
  locale: string;
}) {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: metadata.title,
    url: `${CLIENT_HOST}/`,
    description: metadata.description,
    inLanguage: locale === "vi" ? "vi-VN" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${CLIENT_HOST}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: metadata.title,
        item: `${CLIENT_HOST}/`,
      },
    ],
  };

  return {
    websiteJsonLd,
    breadcrumbJsonLd,
  };
}

export { genJsonLd };
