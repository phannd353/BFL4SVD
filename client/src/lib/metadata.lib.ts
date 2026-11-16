import { Metadata } from "next";
import { join } from "node:path";
import { CLIENT_HOST } from "./config";

interface GenMetadataParams {
  title: string;
  description: string;
  locale: string;
  logo?: string | null;
  path?: string;
  keywords?: string[];
  images?: string[];
}
function genMetadata({
  title,
  description,
  locale,
  logo,
  path = "/",
  keywords,
  images = [],
}: GenMetadataParams): Metadata {
  const canonicalPath = path === "/" ? "" : path;
  if (!images.length && logo) {
    images = [logo];
  }

  return {
    title,
    description,
    metadataBase: new URL(CLIENT_HOST),
    ...(keywords && { keywords }),
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "vi" ? "vi_VN" : "en_US",
      siteName: title,
      images,
      alternateLocale: locale === "vi" ? ["en_US"] : ["vi_VN"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    alternates: {
      canonical: join(CLIENT_HOST, canonicalPath),
      languages: {
        vi: join(CLIENT_HOST, canonicalPath),
        "x-default": join(CLIENT_HOST, canonicalPath),
      },
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export { genMetadata };
