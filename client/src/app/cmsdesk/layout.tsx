import { redirect } from "next/navigation";
import { Metadata } from "next";

import DashboardLayout from "@/components/cmsdesk/dashboard-layout";
import { isClient } from "@/lib/auth-client";
import { getAuthSession } from "@/helper/auth.helper";
import { RedirectUnauthenticated } from "@/components/auth/redirect-unauthenticated";

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      index: false,
    },
  };
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getAuthSession();

  if (user && !isClient(user.role)) {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <RedirectUnauthenticated />
      {children}
    </DashboardLayout>
  );
}
