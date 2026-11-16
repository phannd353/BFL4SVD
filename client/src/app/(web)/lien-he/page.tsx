import { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "@/i18n/navigation";
import { getMetadata } from "@/content/landing/metadata";
import ContactForm from "@/components/website/contact/ContactForm";
import {
  FacebookIcon,
  XIcon,
  InstagramIcon,
  ThreadsIcon,
  GithubIcon,
} from "@/components/icons/socials";
import { genMetadata } from "@/lib/metadata.lib";
import LinkedInIcon from "@/components/icons/socials/linkedin-icon";

type Props = {
  params: Promise<{}>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = "/lien-he";
  try {
    const locale = "vi"; // Default locale, you can change this based on your needs
    const metadata = await getMetadata({ locale });

    const t = await getTranslations({ locale, namespace: "ContactPage" });

    return genMetadata({
      title: `${t("header.title")} - ${metadata.title}`,
      description: t("header.description"),
      locale,
      path,
      logo: metadata.logo,
    });
  } catch (error) {
    const title = "PhanND";
    const description = "Contact me for any inquiries or collaborations.";

    return genMetadata({ title, description, locale: "vi", path });
  }
}

export default async function ContactPage({ params }: { params: Promise<{}> }) {
  const locale = "vi";
  const appData = await getMetadata({ locale });
  const t = await getTranslations({ locale, namespace: "ContactPage" });
  const addressLines = [
    `${appData?.address?.district ?? ""}, ${appData?.address?.province ?? ""}, ${appData?.address?.country ?? ""}`,
  ];

  return (
    <div className="container mx-auto py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground text-lg mx-auto">
            {t("header.description")}
          </p>
        </div>

        <Separator />

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="md:col-span-3 flex space-x-6">
            {/* Contact Cards */}
            <Card className="grow">
              <CardHeader>
                <CardTitle className="text-lg">{t("info.title")}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Address */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold">{t("info.address.label")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {addressLines.length
                        ? addressLines.map((line, idx) => (
                            <span key={idx}>
                              {line}
                              <br />
                            </span>
                          ))
                        : t("common.empty")}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                {/*<div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold">{t('info.phone.label')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {appData?.msisdn ?? t('common.empty')}
                    </p>
                  </div>
                </div>*/}

                {/* Email */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold">{t("info.email.label")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {appData?.email ?? t("common.empty")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card className="grow">
              <CardHeader>
                <CardTitle className="text-lg">{t("social.title")}</CardTitle>
                <CardDescription>{t("social.description")}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex gap-3">
                  <a
                    href={appData?.social?.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("social.aria.linkedin")}
                    className={buttonVariants({
                      variant: "outline",
                      className: "rounded-full",
                    })}
                  >
                    <LinkedInIcon className="h-5 w-5" />
                  </a>

                  <a
                    href={appData?.social?.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("social.aria.github")}
                    className={buttonVariants({
                      variant: "outline",
                      className: "rounded-full",
                    })}
                  >
                    <GithubIcon className="h-5 w-5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
