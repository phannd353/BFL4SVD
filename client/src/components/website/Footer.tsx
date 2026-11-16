"use client";

import Link from "@/i18n/navigation";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";
import { getFooterNavItems } from "@/content/menus/footer-nav-items";
import {
  FacebookIcon,
  YoutubeIcon,
  TiktokIcon,
  ZaloIcon,
  TwitterIcon,
  InstagramIcon,
  ThreadsIcon,
  XIcon,
} from "@/components/icons/socials";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import LinkedInIcon from "@/components/icons/socials/linkedin-icon";

interface FooterProps {
  title: string;
  logo: string;
  logoDark: string;
  description: string;
  social: {
    linkedin?: string;
    github?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    zalo?: string;
    twitter?: string;
    instagram?: string;
    threads?: string;
  };
  email: string;
  // msisdn?: string;
  // address: {
  //   street?: string;
  //   district?: string;
  //   province?: string;
  // };
  navItems: Awaited<ReturnType<typeof getFooterNavItems>>;
}

export const Footer = ({
  title,
  logo,
  logoDark,
  description,
  social,
  email,
  // msisdn,
  // address,
  navItems,
}: FooterProps) => {
  const t = useTranslations("HomePage.Footer");
  const { resolvedTheme: theme } = useTheme();
  const logoToUse = theme === "dark" ? logoDark : logo;

  return (
    <footer id="footer">
      <hr className="w-11/12 mx-auto" />

      <section className="container py-20 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-12 gap-y-8">
        <div className="col-span-full xl:col-span-2">
          <Link
            rel="noreferrer noopener"
            href="/"
            className="font-bold text-xl flex items-center"
          >
            <Image
              src={logoToUse}
              alt={title}
              width={100}
              height={100}
              priority
              fetchPriority="high"
              className="logo-img mr-2 object-contain"
            />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">{description}</p>
        </div>

        {Object.keys(social).length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg">{t("follow-us")}</h3>
            {social?.linkedin && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.linkedin}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <LinkedInIcon className="h-5 w-5" />
                  LinkedIn
                </Link>
              </div>
            )}

            {social?.github && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.github}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.523 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  GitHub
                </Link>
              </div>
            )}

            {social?.facebook && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.facebook}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <FacebookIcon className="h-6 w-6" />
                  Facebook
                </Link>
              </div>
            )}

            {social?.twitter && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.twitter}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <XIcon className="h-6 w-6" />X (Twitter)
                </Link>
              </div>
            )}

            {social?.youtube && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.youtube}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <YoutubeIcon className="h-6 w-6" />
                  YouTube
                </Link>
              </div>
            )}

            {social?.instagram && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.instagram}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <InstagramIcon className="h-6 w-6" />
                  Instagram
                </Link>
              </div>
            )}

            {social?.threads && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.threads}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <ThreadsIcon className="h-6 w-6" />
                  Threads
                </Link>
              </div>
            )}

            {social?.tiktok && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.tiktok}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <TiktokIcon className="h-6 w-6" />
                  TikTok
                </Link>
              </div>
            )}

            {social?.zalo && (
              <div>
                <Link
                  rel="noreferrer noopener"
                  href={social.zalo}
                  target="_blank"
                  className="opacity-60 hover:opacity-100 flex items-center gap-2"
                >
                  <ZaloIcon className="h-6 w-6" />
                  Zalo
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">{t("see-more")}</h3>
          {navItems
            .sort((a, b) => a.order - b.order)
            .map((item, index) => (
              <div key={index}>
                <Link
                  rel="noreferrer noopener"
                  href={item.link_url}
                  className="opacity-60 hover:opacity-100"
                  target={item.link_new_tab ? "_blank" : ""}
                >
                  {item.link_label}
                </Link>
              </div>
            ))}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">{t("contact")}</h3>
          <div>
            <Link
              href={`mailto:${email}`}
              className="opacity-60 hover:opacity-100 flex items-center gap-2 text-sm"
            >
              <Mail className="h-4 w-4" />
              {email}
            </Link>
          </div>

          {/*{msisdn && (
            <div>
              <Link
                href={`tel:${msisdn}`}
                className="opacity-60 hover:opacity-100 flex items-center gap-2 text-sm"
              >
                <Phone className="h-4 w-4" />
                {msisdn}
              </Link>
            </div>
          )}*/}

          {/*{(address?.street || address?.district || address?.province) && (
            <div className="opacity-60 flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {address.street && (
                  <>
                    {address.street},
                    <br />
                  </>
                )}
                {address.district && (
                  <>
                    {address.district},
                    <br />
                  </>
                )}
                {address.province}
              </span>
            </div>
          )}*/}
        </div>
      </section>

      <section className="container pb-14 text-center">
        <h3>{t("copyright")}</h3>
      </section>
    </footer>
  );
};
