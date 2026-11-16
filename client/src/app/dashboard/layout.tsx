import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Metadata } from "next";

import { RedirectUnauthenticated } from "@/components/auth/redirect-unauthenticated";
import { getAuthSession } from "@/helper/auth.helper";
import { isClient } from "@/lib/auth-client";

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      index: false,
    },
  };
}

export default async function DashboardLayout({
  admin,
  client,
}: Readonly<{
  admin: ReactNode;
  client: ReactNode;
}>) {
  const { user } = await getAuthSession();

  if (!user || (user && !isClient(user.role))) {
    redirect("/");
  }
  return (
    <>
      <RedirectUnauthenticated />
      {user.role === "client" && client}
      {user.role === "admin" && admin}
    </>
  );
}
