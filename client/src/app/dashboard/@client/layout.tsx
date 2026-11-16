"use server";

import { SharedDashboardLayout } from "@/components/shared/dashboard-layout";
import { Gauge } from "lucide-react";

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
          href: "/dashboard/training-jobs",
          icon: <Gauge />,
          label: "Training jobs",
        },
      ]}
    >
      {children}
    </SharedDashboardLayout>
  );
}
