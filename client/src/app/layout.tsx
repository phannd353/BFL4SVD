import { Providers } from "./provider";

import { ScrollToTop } from "@/components/ScrollToTop";

import "../styles/globals.css";
import { getMessages } from "next-intl/server";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { API_ENDPOINT } from "@/lib/config";
import { Suspense } from "react";

const font = Inter({
  subsets: ["latin"],
  display: "swap",
});
const locales = ["vi", "en"] as const;
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{}>;
}>) {
  const locale = "vi"; // Replace with your desired locale or retrieve it from params if needed
  const messages = await getMessages({ locale });

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${font.className}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href={API_ENDPOINT} />
      </head>
      <body className={`antialiased flex min-h-svh flex-col`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Suspense fallback={null}>
            <Providers>
              {children}

              <ScrollToTop />
            </Providers>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
