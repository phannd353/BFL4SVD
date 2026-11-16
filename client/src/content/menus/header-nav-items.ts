import { getTranslations } from "next-intl/server";

export async function getHeaderNavItems({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Shared" });

  return [
    {
      order: 2,
      link_new_tab: false,
      link_url: "/blog",
      link_label: t("blog"),
    },
    {
      order: 3,
      link_new_tab: false,
      link_url: "/projects",
      link_label: t("projects"),
    },
    {
      order: 4,
      link_new_tab: false,
      link_url: "/lien-he",
      link_label: t("contact"),
    },
  ];
}
