import type { Metadata } from "next";
import { Navbar } from "@/components/website/Navbar";
import { Footer } from "@/components/website/Footer";
import "@/styles/globals.css";
import { genMetadata } from "@/lib/metadata.lib";
import { getMetadata } from "@/content/landing/metadata";
import { getHeaderNavItems } from "@/content/menus/header-nav-items";
import { getFooterNavItems } from "@/content/menus/footer-nav-items";
import GoogleAnalytics from "@/components/website/GoogleAnalytics";

export const revalidate = 60; // Revalidate every 60 seconds

type Props = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const locale = "vi"; // Default locale, you can change this based on your needs
    const metadata = await getMetadata({ locale });

    const title = metadata.title;
    const description = metadata.description;
    const logo = metadata.logo;

    return genMetadata({
      title,
      description,
      locale,
      logo,
      path: "/",
      keywords: [
        "federated learning",
        "software vulnerability detection",
        "blockchain",
        "secure software",
      ],
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    const title = "BFL4SVD — Software Vulnerability Detection";
    const description =
      "A blockchain-based federated learning platform for software vulnerability detection.";

    return genMetadata({ title, description, locale: "vi", path: "/" });
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = "vi"; // Default locale, you can change this based on your needs
  const appData = await getMetadata({ locale });
  const headerNavItems = await getHeaderNavItems({ locale });
  const footerNavItems = await getFooterNavItems({ locale });

  return (
    <>
      <Navbar
        appTitle={appData.title}
        appLogo={appData.logo}
        appLogoDark={appData.logoDark}
        navItems={headerNavItems}
      />

      <GoogleAnalytics />
      {children}

      <Footer
        title={appData.title}
        logo={appData.logo}
        logoDark={appData.logoDark}
        description={appData.description}
        social={{
          linkedin: appData.social.linkedin,
          github: appData.social.github,
        }}
        email={appData.email}
        // msisdn={appData.msisdn}
        // address={{
        //   street: appData.address.street,
        //   district: appData.address.district,
        //   province: appData.address.province,
        // }}
        navItems={footerNavItems}
      />
    </>
  );
}
