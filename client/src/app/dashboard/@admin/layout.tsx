"use server";

import { SharedDashboardLayout } from "@/components/shared/dashboard-layout";
import { BriefcaseBusiness, FileBox, Gauge, Users } from "lucide-react";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SharedDashboardLayout
      basePath="/dashboard"
      navItems={[
        {
          href: "/dashboard/users",
          icon: <Users />,
          label: "Users",
        },
        {
          href: "/dashboard/training-jobs",
          icon: <BriefcaseBusiness />,
          label: "Training jobs",
        },
        {
          href: "/dashboard/models",
          icon: <FileBox />,
          label: "Models",
        },
      ]}
    >
      {children}
    </SharedDashboardLayout>
  );
}
